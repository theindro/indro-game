// world/InteractablePropManager.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages interactable props (chests, ores, logs, herbs, barrels …)
// that are procedurally placed into world chunks.
//
// Designed to sit alongside PropManager (decorative props) and plug into
// OpenWorldManager the same way.
//
// Usage in OpenWorldManager:
//
//   import { InteractablePropManager } from './InteractablePropManager.js';
//
//   // In constructor:
//   this.interactablePropManager = new InteractablePropManager(
//       world, colliders, this.worldSeed
//   );
//   this.interactablePropManager.setLayer(this.entityLayer);
//
//   // In loadChunk():
//   await this.interactablePropManager.generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize);
//
//   // In unloadChunk():
//   this.interactablePropManager.unloadChunkProps(key);
//
//   // In update() / game loop (pass player world-space position):
//   this.interactablePropManager.update(playerX, playerZ, dt);
//
//   // From your input handler, call when player presses E / interact key:
//   const result = this.interactablePropManager.tryInteract(playerX, playerZ);
//   if (result) console.log('Got loot:', result.loot);
// ─────────────────────────────────────────────────────────────────────────────

import { Container, Sprite, Graphics, Texture, Text } from 'pixi.js';
import {
    INTERACTABLE_PROP_TYPES,
    BIOME_INTERACTABLE_CONFIG,
    LOOT_TABLES,
} from './interactablePropConfig.js';
import { assetManager } from '../utils/assetManager.js';
import {OutlineFilter} from "pixi-filters";

const HOVER_FILTER = new OutlineFilter({
    thickness: 2,
    color: 'white',
    alpha: 0.25,
    quality: 0.4,
});

// ── Visual constants ─────────────────────────────────────────────────────────
const GLOW_PULSE_SPEED   = 2.5;   // radians per second
const GLOW_MIN_ALPHA     = 0;
const GLOW_MAX_ALPHA     = 0;
const INDICATOR_FONT     = { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, align: 'center' };
const INTERACT_KEY_LABEL = '[E]';
const HARVEST_BAR_W      = 48;
const HARVEST_BAR_H      = 6;
const ACTIVE_DIST = 500;
const ACTIVE_DIST_SQ = ACTIVE_DIST * ACTIVE_DIST;

// ─────────────────────────────────────────────────────────────────────────────
export class InteractablePropManager {
    constructor(worldObjects, worldSeed = 1, options = {}) {
        this.worldObjects = worldObjects;
        this.worldSeed = worldSeed;
        this.onLoot = options.onLoot ?? null;
        this.persistedProps = options.persistedProps ?? new Set();

        this.layer = null; // legacy; parenting goes through worldObjects

        // chunk key → { props: InteractableProp[] }
        this.activeChunks = new Map();

        // All live interactable prop instances (across loaded chunks)
        this.allProps = [];

        // Currently highlighted prop (nearest in range)
        this._highlighted = null;

        // Elapsed time for animations
        this._elapsed = 0;
    }

    /** Point this manager to the render layer (usually entityLayer) */
    setLayer(layer) {
        this.layer = layer;
    }

    // ── Seeded random helpers ─────────────────────────────────────────────────

    seededRandom(seed) {
        const x = Math.sin(seed + 1) * 10000;
        return x - Math.floor(x);
    }

    hash(cx, cz, extra = 0) {
        return (this.worldSeed ^ (cx * 73856093) ^ (cz * 19349663) ^ (extra * 83492791)) >>> 0;
    }

    // ── Chunk lifecycle ───────────────────────────────────────────────────────

    /**
     * Generate and place interactable props for a chunk.
     * @param {number} chunkX
     * @param {number} chunkZ
     * @param {string} biome         - 'forest' | 'desert' | 'ice' | 'lava'
     * @param {number} chunkSize     - tiles per chunk side
     * @param {number} tileSize      - px per tile
     */
    async generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize) {
        const key = `${chunkX},${chunkZ}`;
        if (this.activeChunks.has(key)) return;

        const chunkSizeWorld = chunkSize * tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;
        const baseSeed = this.hash(chunkX, chunkZ);

        const biomeConfig = BIOME_INTERACTABLE_CONFIG[biome];
        if (!biomeConfig) {
            this.activeChunks.set(key, { props: [] });
            return;
        }

        const spawned = [];           // InteractableProp instances for this chunk
        const placedPositions = [];   // { x, z, minDist } for overlap checks

        let categoryIndex = 0;

        for (const [category, categoryConfig] of Object.entries(biomeConfig)) {
            const catSeed = baseSeed + categoryIndex * 77777;
            categoryIndex++;

            // ── Roll whether this category spawns at all this chunk ─────────
            const rollIntensity = this.seededRandom(catSeed);
            if (rollIntensity > categoryConfig.intensity) continue;

            // ── Build weighted prop pool ────────────────────────────────────
            const pool = [];
            for (const entry of categoryConfig.props) {
                for (let w = 0; w < entry.weight; w++) pool.push(entry.type);
            }
            if (pool.length === 0) continue;

            const max = categoryConfig.maxPerChunk;
            const minDist = categoryConfig.minDistance || 100;

            // Attempt to place up to maxPerChunk props
            let placed = 0;
            for (let attempt = 0; attempt < max * 8 && placed < max; attempt++) {
                const aSeed = catSeed + attempt * 3331;

                const typeId = pool[Math.floor(this.seededRandom(aSeed) * pool.length)];
                const propDef = INTERACTABLE_PROP_TYPES[typeId];
                if (!propDef) continue;

                const x = startX + this.seededRandom(aSeed + 11) * chunkSizeWorld;
                const z = startZ + this.seededRandom(aSeed + 22) * chunkSizeWorld;

                // Check distance from other interactables placed so far
                let ok = true;
                for (const p of placedPositions) {
                    if (Math.hypot(p.x - x, p.z - z) < Math.max(minDist, p.minDist)) {
                        ok = false;
                        break;
                    }
                }
                if (!ok) continue;

                // 2. avoid world colliders
                const radius = propDef.radius || 20;
                if (this._isColliding(x, z, radius)) continue;

                const scaleR = propDef.scaleRange;
                const scale  = scaleR.min + this.seededRandom(aSeed + 33) * (scaleR.max - scaleR.min);

                const id = `${key}_${typeId}_${x.toFixed(0)}_${z.toFixed(0)}`;

                if (this.persistedProps.has(id)) {
                    continue;
                }

                const prop = this._createProp(propDef, x, z, scale, key);
                if (!prop) continue;

                spawned.push(prop);
                this.allProps.push(prop);
                placedPositions.push({ x, z, minDist });
                placed++;
            }
        }

        this.activeChunks.set(key, { props: spawned });
    }

    /** Remove all props belonging to a chunk */
    unloadChunkProps(key) {
        const data = this.activeChunks.get(key);
        if (!data) return;

        for (const prop of data.props) {
            this._destroyProp(prop);
        }

        // Remove from allProps
        this.allProps = this.allProps.filter(p => p.chunkKey !== key);

        this.worldObjects.removeCollidersIf(
            (c) => c.interactableChunkKey === key && c.type === 'interactable'
        );

        this.activeChunks.delete(key);
    }

    // ── Frame update ──────────────────────────────────────────────────────────

    /**
     * Call every frame from OpenWorldManager.update().
     * @param {number} playerX  - world space X
     * @param {number} playerZ  - world space Z (Y on screen)
     * @param {number} dt       - delta time seconds
     */
    update(playerX, playerZ, dt) {
        this._elapsed += dt;

        for (const prop of this.allProps) {
            const dx = prop.x - playerX;
            const dz = prop.z - playerZ;

            if ((dx * dx + dz * dz) > ACTIVE_DIST_SQ) {
                continue;
            }

            // Handle respawn timer for dead props
            if (!prop.alive) {
                if (prop.def.respawnTime && prop.deadAt !== null) {
                    if (Date.now() - prop.deadAt >= prop.def.respawnTime) {
                        this._respawnProp(prop);
                    }
                }
                continue;
            }

            // Animate glow pulse
            if (prop.glowSprite) {
                const t = (Math.sin(this._elapsed * GLOW_PULSE_SPEED + prop._phase) + 1) * 0.5;
                prop.glowSprite.alpha = GLOW_MIN_ALPHA + t * (GLOW_MAX_ALPHA - GLOW_MIN_ALPHA);
            }

            // Tick harvest if active (dt is already seconds)
            if (prop._harvesting) {
                this._tickHarvest(prop, dt);
            }
        }

        // Determine nearest in-range prop and update indicator
        const nearest = this._findNearest(playerX, playerZ);

        if (nearest !== this._highlighted) {
            if (this._highlighted) this._hideIndicator(this._highlighted);
            this._highlighted = nearest;
        }

        if (this._highlighted) {
            this._showIndicator(this._highlighted);
        }
    }

    // ── Interaction API ───────────────────────────────────────────────────────

    /**
     * Call when the player presses the interact key.
     *
     * Does its own proximity scan so it never depends on whether update()
     * happened to run this exact frame first.
     *
     * Returns { prop, loot } for instant interactions (chests/containers).
     * Returns { prop, loot: null, harvesting: true } when a harvest starts.
     * Returns null when nothing is in range.
     */
    tryInteract(playerX, playerZ) {
        const prop = this._findNearest(playerX, playerZ);
        if (!prop || !prop.alive) return null;

        if (prop.def.category === 'chest' || prop.def.category === 'container') {
            return this._openProp(prop);
        }

        if (prop.def.harvestTime) {
            console.log('[tryInteract] starting harvest, NOT opening');
            if (prop._harvesting) return null;
            prop._harvesting = true;
            prop._harvestAccum = 0;
            this._showHarvestBar(prop);
            return { prop, loot: null, harvesting: true };
        }

        console.log('[tryInteract] fallthrough to instant open - harvestTime was falsy');
        return this._openProp(prop);
    }

    /**
     * Call when the player RELEASES the interact key (cancels harvest).
     */
    cancelInteract() {
        // Cancel whichever prop is currently being harvested
        for (const prop of this.allProps) {
            if (prop._harvesting) {
                prop._harvesting   = false;
                prop._harvestAccum = 0;
                this._hideHarvestBar(prop);
            }
        }
    }

    /**
     * Find the nearest alive prop within its interactRange of the player.
     * This is O(n) over loaded props but n is tiny (a few dozen at most).
     * @private
     */
    _findNearest(playerX, playerZ) {
        let nearest     = null;
        let nearestDist = Infinity;

        for (const prop of this.allProps) {
            if (!prop.alive) continue;

            const dist = Math.hypot(prop.x - playerX, prop.z - playerZ);
            if (dist < prop.def.interactRange && dist < nearestDist) {
                nearestDist = dist;
                nearest     = prop;
            }
        }

        return nearest;
    }

    // ── Internal prop lifecycle ───────────────────────────────────────────────

    _createProp(def, x, z, scale, chunkKey) {
        const id = `${chunkKey}_${def.id}_${x.toFixed(0)}_${z.toFixed(0)}`;
        const container = new Container();
        container.x = x;
        container.y = z;
        container.zIndex = z;
        container.sortableChildren = false;

        // ── Glow circle underneath ──
        const glow = new Graphics();
        const glowR = (def.radius || 28) * 1.6 * scale;
        glow.circle(0, 0, glowR).fill({ color: def.glowColor ?? 0xffffff });
        glow.alpha = GLOW_MIN_ALPHA;
        glow.blendMode = 'add';
        container.addChild(glow);

        // Shadow

        const shadow = new Graphics();

        shadow
            .ellipse(0, 0, def.radius * 0.8, def.radius * 0.25)
            .fill({
                color: 0x000000,
                alpha: 0.15
            });

        container.addChild(shadow);

        const targetSize = def.radius * 2; // example: 30px ore

        // ── Prop sprite / fallback ──
        let visual;
        const texture = assetManager.getTexture(def.texture);
        if (texture) {
            visual = new Sprite(texture);
            visual.anchor.set(0.5, 1);

            // Fit sprite into target size
            const maxDim = Math.max(texture.width, texture.height);
            const scale = targetSize / maxDim;

            visual.scale.set(scale);
        } else {
            visual = this._makeFallback(def, scale);
        }

        visual.eventMode = 'static';
        visual.cursor = 'pointer';

        visual.on('pointerover', () => {
            visual.filters = [HOVER_FILTER];
        });

        visual.on('pointerout', () => {
            visual.filters = null;
        });

        container.addChild(visual);

        // ── [E] indicator (hidden by default) ──
        const indicator = new Text(INTERACT_KEY_LABEL + '\n' + def.label, {
            ...INDICATOR_FONT,
            fontSize: 10,
        });
        indicator.anchor.set(0.5, 1);
        indicator.y = -(visual.height + 8);
        indicator.visible = false;
        container.addChild(indicator);

        // ── Harvest progress bar (hidden by default) ──
        const barBg = new Graphics();
        barBg.rect(-HARVEST_BAR_W / 2, 0, HARVEST_BAR_W, HARVEST_BAR_H)
            .fill({ color: 0x222222 });
        barBg.y = -(visual.height + 20);
        barBg.visible = false;
        container.addChild(barBg);

        const barFill = new Graphics();
        barFill.rect(-HARVEST_BAR_W / 2, 0, 0, HARVEST_BAR_H)
            .fill({ color: 0x44ee44 });
        barFill.y = barBg.y;
        barFill.visible = false;
        container.addChild(barFill);

        this.worldObjects.addToEntityLayer(container);

        const collider = {
            x: x,
            y: z - (targetSize / 2),
            width: targetSize,
            height: targetSize,
            collision: false,
            type: 'interactable',
            interactableChunkKey: chunkKey,
        };

        this.worldObjects.addWorldCollider(collider);

        container.zIndex = z;

        const prop = {
            def,
            x, z,
            scale,
            chunkKey,
            id: id,
            alive: true,
            deadAt: null,
            container,
            glowSprite: glow,
            visual,
            indicator,
            barBg,
            barFill,
            collider,
            _phase: Math.random() * Math.PI * 2,    // random pulse phase
            _harvesting: false,
            _harvestAccum: 0,
        };

        return prop;
    }

    _isColliding(x, z, radius) {
        for (const c of this.worldObjects.colliders) {
            if (!c.collision) continue;

            const cx = c.x;
            const cz = c.y;

            const dx = cx - x;
            const dz = cz - z;

            const distX = Math.abs(dx);
            const distZ = Math.abs(dz);

            const halfW = c.width / 2;
            const halfH = c.height / 2;

            // simple AABB vs circle-ish check
            if (distX < halfW + radius && distZ < halfH + radius) {
                return true;
            }
        }
        return false;
    }

    _destroyProp(prop) {
        this.worldObjects.removeAndDestroyDisplayObject(prop.container);
    }

    _killProp(prop) {
        prop.alive  = false;
        prop.deadAt = Date.now();
        if (prop.container) prop.container.visible = false;
        // Mark collider inactive
        if (prop.collider) prop.collider.collision = false;
    }

    _respawnProp(prop) {
        prop.alive  = true;
        prop.deadAt = null;
        if (prop.container) prop.container.visible = true;
        if (prop.collider) prop.collider.collision = true;
    }

    // ── Interaction logic ─────────────────────────────────────────────────────

    _openProp(prop) {
        const loot = this._rollLoot(prop.def.lootTable);

        // Play anim FIRST while container is still visible, then kill
        this._playOpenAnim(prop);

        // Mark dead immediately so it can't be interacted with again,
        // but DON'T set container.visible = false here — the anim handles that
        prop.alive  = false;
        prop.deadAt = Date.now();
        if (prop.collider) prop.collider.collision = false;

        this.persistedProps.add(prop.id);

        if (this.onLoot) this.onLoot(loot, prop.def, prop.x, prop.z);

        return { prop, loot };
    }

    _tickHarvest(prop, dt) {
        prop._harvestAccum += dt;

        const pct = Math.min(1, prop._harvestAccum / prop.def.harvestTime);

        // Update bar fill — min 2px so bar is visible at 0%
        if (prop.barFill) {
            prop.barFill.clear();
            prop.barFill
                .rect(-HARVEST_BAR_W / 2, 0, Math.max(2, HARVEST_BAR_W * pct), HARVEST_BAR_H)
                .fill({ color: 0x44ee44 });
        }

        if (pct >= 1) {
            prop._harvesting   = false;
            prop._harvestAccum = 0;
            this._hideHarvestBar(prop);
            this._openProp(prop);
        }
    }

    // ── Loot rolling ─────────────────────────────────────────────────────────

    /**
     * Roll a loot table and return an array of { id, amount } drops.
     * @param {string} tableId
     * @returns {{ id: string, amount: number }[]}
     */
    _rollLoot(tableId) {
        const table = LOOT_TABLES[tableId];
        if (!table) return [];

        const drops = [];
        for (const entry of table) {
            if (Math.random() <= entry.chance) {
                const amount = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
                drops.push({ id: entry.id, amount });
            }
        }
        return drops;
    }

    // ── Visual helpers ────────────────────────────────────────────────────────

    _showIndicator(prop) {
        if (prop.indicator) prop.indicator.visible = true;
    }

    _hideIndicator(prop) {
        if (prop.indicator) prop.indicator.visible = false;
    }

    _showHarvestBar(prop) {
        if (prop.barBg)   prop.barBg.visible   = true;
        if (prop.barFill) prop.barFill.visible  = true;
    }

    _hideHarvestBar(prop) {
        if (prop.barBg)   prop.barBg.visible   = false;
        if (prop.barFill) prop.barFill.visible  = false;
    }

    /** Quick scale-pop + fade for opening animation.
     *  Must be called BEFORE _killProp so container.visible is still true. */
    _playOpenAnim(prop) {
        if (!prop.container) return;

        // Make sure it's visible for the animation duration
        prop.container.visible = true;

        const DURATION = 0.3; // seconds
        let startTime = null;

        const tick = (timestamp) => {
            // Guard: container may have been destroyed if chunk unloaded mid-anim
            if (!prop.container || prop.container.destroyed) return;

            if (startTime === null) startTime = timestamp;
            const elapsed = (timestamp - startTime) / 1000;
            const pct     = Math.min(1, elapsed / DURATION);

            prop.container.scale.set(1 + Math.sin(pct * Math.PI) * 0.35);
            prop.container.alpha = 1 - pct;

            if (pct < 1) {
                requestAnimationFrame(tick);
            } else {
                prop.container.visible = false;
                prop.container.alpha   = 1;
                prop.container.scale.set(1);
            }
        };

        requestAnimationFrame(tick);
    }

    _makeFallback(def, scale) {
        const g     = new Graphics();
        const r     = (def.radius || 24) * scale;
        const color = def.fallbackColor ?? 0x888888;

        g.roundRect(-r, -r * 2, r * 2, r * 2, 6).fill({ color });
        g.circle(0, -r, r * 0.4).fill({ color: def.glowColor ?? 0xffffff });

        return g;
    }

    // ── Public query helpers ──────────────────────────────────────────────────

    /** Returns the nearest alive interactable within `range` px, or null */
    getNearestProp(playerX, playerZ, range = 120) {
        let nearest     = null;
        let nearestDist = range;

        for (const prop of this.allProps) {
            if (!prop.alive) continue;
            const d = Math.hypot(prop.x - playerX, prop.z - playerZ);
            if (d < nearestDist) {
                nearestDist = d;
                nearest     = prop;
            }
        }

        return nearest;
    }

    /** Returns counts of alive props by category across all loaded chunks */
    getStats() {
        const stats = {};
        for (const prop of this.allProps) {
            if (!prop.alive) continue;
            const cat        = prop.def.category;
            stats[cat] = (stats[cat] || 0) + 1;
        }
        return stats;
    }

    spawnManualProp(typeId, x, z, scale = 1, chunkKey = 'editor') {

        const def = INTERACTABLE_PROP_TYPES[typeId];

        if (!def) return null;

        const prop = this._createProp(
            def,
            x,
            z,
            scale,
            chunkKey
        );

        let bucket = this.activeChunks.get(chunkKey);
        if (!bucket) {
            bucket = { props: [] };
            this.activeChunks.set(chunkKey, bucket);
        }
        bucket.props.push(prop);

        this.allProps.push(prop);

        return prop;
    }

    removeProp(prop) {

        this._destroyProp(prop);

        this.allProps =
            this.allProps.filter(p => p !== prop);

        this.worldObjects.removeCollider(prop.collider);
    }

    clear() {
        // 1. Remove all interactable props
        for (const prop of this.allProps) {
            this._destroyProp(prop);
        }

        this.worldObjects.removeCollidersIf((c) => c.type === 'interactable');

        // 3. Reset state
        this.allProps = [];
        this.activeChunks.clear();
        this._highlighted = null;
        this._elapsed = 0;
    }
}