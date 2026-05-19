// world/InteractablePropManager.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages interactable props (chests, ores, logs, herbs, barrels …)
// that are procedurally placed into world chunks.
//
// Shadow, scale, and collider patterns mirror PropManager exactly.
// ─────────────────────────────────────────────────────────────────────────────

import {Container, Sprite, Graphics, Texture, Text, BlurFilter} from 'pixi.js';
import {
    getInteractablePropTypes,
    getBiomeInteractableConfig,
    getLootTables,
} from './interactablePropConfig.js';
import { assetManager } from '../utils/assetManager.js';
import { shadowManager } from '../controllers/createShadowController.js';
import { VFX } from '../GlobalEffects.js';
import { useGameStore } from '../../stores/gameStore.js';
import { scaleInteractableIntensity } from './chunkProfile.js';
import { sampleInteractablePosition, RESOURCE_YARD_LAYOUTS } from './chunkPlacement.js';
import { INTERACTABLE_HOVER_FILTER } from '../utils/highlightFilters.js';
import { computeFootSortZ } from './sortDepth.js';

// ── Visual constants ─────────────────────────────────────────────────────────
const GLOW_PULSE_SPEED   = 25;
const GLOW_MIN_ALPHA     = 0;
const GLOW_MAX_ALPHA     = 0;
const INTERACT_KEY_LABEL = '[E]';
const HARVEST_BAR_W      = 48;
const HARVEST_BAR_H      = 6;
const ACTIVE_DIST        = 500;
const ACTIVE_DIST_SQ     = ACTIVE_DIST * ACTIVE_DIST;
/** Cancel harvest if player moves more than this (world px) from start position. */
const HARVEST_CANCEL_MOVE_SQ = 14 * 14;
/** Renders above trees/props on entityLayer (Y-sorted props use z ≈ y). */
const INTERACT_UI_Z_INDEX = 2_000_000;

const INDICATOR_TEXT_STYLE = {
    fontFamily: 'Nunito, sans-serif',
    fontSize: 11,
    fill: 0xffffff,
    align: 'center',
    dropShadow: {
        alpha: 0.85,
        blur: 3,
        color: 0x000000,
        distance: 2,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
export class InteractablePropManager {
    constructor(worldObjects, worldSeed = 1, options = {}) {
        this.worldObjects    = worldObjects;
        this.worldSeed       = worldSeed;
        this.onLoot          = options.onLoot ?? null;
        this.onEventStart    = options.onEventStart ?? null;
        this._hovered = null;

        this.layer = null;

        // chunk key → { props: InteractableProp[] }
        this.activeChunks = new Map();

        // All live interactable prop instances (across loaded chunks)
        this.allProps = [];

        // shadow sprite → shadowManager numeric id  (mirrors PropManager.shadowRegistry)
        this.shadowRegistry = new Map();

        // Currently highlighted prop (nearest in range)
        this._highlighted = null;

        // Elapsed time for animations
        this._elapsed = 0;

        /** @type {{ x: number, z: number } | null} */
        this._harvestAnchor = null;
        this._lastPlayerHp = useGameStore.getState().player?.hp ?? 100;

        /** @type {import('pixi.js').Container | null} */
        this.uiLayer = null;
    }

    /** Point this manager to the render layer (usually entityLayer) */
    setLayer(layer) {
        this.layer = layer;
        this._ensureUiLayer();
    }

    _ensureUiLayer() {
        const layer = this.layer ?? this.worldObjects?.entityLayer;
        if (!layer) return;

        if (!this.uiLayer) {
            this.uiLayer = new Container();
            this.uiLayer.label = 'interactUiLayer';
            this.uiLayer.zIndex = INTERACT_UI_Z_INDEX;
            this.uiLayer.eventMode = 'none';
            this.uiLayer.sortableChildren = true;
        }

        if (this.uiLayer.parent !== layer) {
            layer.sortableChildren = true;
            layer.addChild(this.uiLayer);
        }
    }

    // ── Seeded random helpers ─────────────────────────────────────────────────

    seededRandom(seed) {
        const x = Math.sin(seed + 1) * 10000;
        return x - Math.floor(x);
    }

    hash(cx, cz, extra = 0) {
        return (this.worldSeed ^ (cx * 73856093) ^ (cz * 19349663) ^ (extra * 83492791)) >>> 0;
    }

    /** FNV-1a-ish string hash for stable loot / VFX seeds from ids. */
    hashString(str) {
        let h = 2166136261 >>> 0;
        const s = String(str);
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h | 0;
    }

    // ── Chunk lifecycle ───────────────────────────────────────────────────────

    async generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize, landscapeContext = null) {
        const key = `${chunkX},${chunkZ}`;
        if (this.activeChunks.has(key)) return;

        const chunkSizeWorld = chunkSize * tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;
        const baseSeed = this.hash(chunkX, chunkZ);

        const biomeConfig = getBiomeInteractableConfig()[biome];
        if (!biomeConfig) {
            this.activeChunks.set(key, { props: [] });
            return;
        }

        const profile = landscapeContext?.profile;
        const anchors = landscapeContext?.anchors;
        const contentScales = landscapeContext?.contentScales;
        const lootMul = contentScales?.lootMultiplier ?? 1;
        const interactableMul = contentScales?.interactableIntensityMul ?? 1;
        const interactableCapMul = contentScales?.interactableMaxMul ?? 1;

        const spawned         = [];
        const placedPositions = [];
        let   categoryIndex   = 0;

        const openedSet = new Set(useGameStore.getState().openedInteractableIds);

        for (const [category, categoryConfig] of Object.entries(biomeConfig)) {
            const catSeed = baseSeed + categoryIndex * 77777;
            categoryIndex++;

            let effectiveIntensity = profile
                ? scaleInteractableIntensity(profile, category, categoryConfig.intensity)
                : categoryConfig.intensity;
            effectiveIntensity = Math.min(1, effectiveIntensity * interactableMul);

            const rollIntensity = this.seededRandom(catSeed);
            if (rollIntensity > effectiveIntensity) continue;

            const pool = [];
            for (const entry of categoryConfig.props) {
                for (let w = 0; w < entry.weight; w++) pool.push(entry.type);
            }
            if (pool.length === 0) continue;

            const maxMul = (profile?.interactableMaxMul?.[category] ?? 1) * interactableCapMul;
            const max = Math.ceil(categoryConfig.maxPerChunk * maxMul);
            const yardLayout = RESOURCE_YARD_LAYOUTS.has(anchors?.type);
            const minDist = yardLayout
                ? Math.min(categoryConfig.minDistance || 100, 72)
                : categoryConfig.minDistance || 100;

            let placed = 0;
            for (let attempt = 0; attempt < max * 8 && placed < max; attempt++) {
                const aSeed  = catSeed + attempt * 3331;
                const typeId = pool[Math.floor(this.seededRandom(aSeed) * pool.length)];
                const propDef = getInteractablePropTypes()[typeId];
                if (!propDef) continue;

                const pos = anchors
                    ? sampleInteractablePosition(anchors, aSeed)
                    : {
                        x: startX + this.seededRandom(aSeed + 11) * chunkSizeWorld,
                        z: startZ + this.seededRandom(aSeed + 22) * chunkSizeWorld,
                    };
                const x = pos.x;
                const z = pos.z;

                let ok = true;
                for (const p of placedPositions) {
                    if (Math.hypot(p.x - x, p.z - z) < Math.max(minDist, p.minDist)) {
                        ok = false;
                        break;
                    }
                }
                if (!ok) continue;

                const radius = propDef.radius || 20;
                if (this._isColliding(x, z, radius)) continue;

                const scaleR  = propDef.scaleRange;
                const scale   = scaleR.min + this.seededRandom(aSeed + 33) * (scaleR.max - scaleR.min);
                const id      = `${key}_${typeId}_${x.toFixed(0)}_${z.toFixed(0)}`;

                if (openedSet.has(id)) continue;

                const prop = this._createProp(propDef, x, z, scale, key);
                if (!prop) continue;
                prop._lootMul = lootMul;

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

        this.allProps = this.allProps.filter(p => p.chunkKey !== key);

        this.worldObjects.removeCollidersIf(
            (c) => c.interactableChunkKey === key && c.type === 'interactable'
        );

        this.activeChunks.delete(key);
    }

    // ── Frame update ──────────────────────────────────────────────────────────

    update(playerX, playerZ, dt) {
        this._elapsed += dt;
        this._ensureUiLayer();

        if (this._harvestAnchor) {
            const harvesting = this.allProps.find((p) => p._harvesting);
            const hp = useGameStore.getState().player.hp;
            const dx = playerX - this._harvestAnchor.x;
            const dz = playerZ - this._harvestAnchor.z;
            const moved = dx * dx + dz * dz > HARVEST_CANCEL_MOVE_SQ;
            const damaged = hp < this._lastPlayerHp;

            let outOfRange = false;
            if (harvesting) {
                const dist = Math.hypot(harvesting.x - playerX, harvesting.z - playerZ);
                outOfRange = dist > harvesting.def.interactRange;
            }

            if (moved || damaged || outOfRange || !harvesting) {
                this.cancelInteract();
            }
        }
        this._lastPlayerHp = useGameStore.getState().player.hp;

        for (const prop of this.allProps) {
            const dx = prop.x - playerX;
            const dz = prop.z - playerZ;

            if ((dx * dx + dz * dz) > ACTIVE_DIST_SQ) continue;

            if (!prop.alive) {
                if (prop.def.respawnTime && prop.deadAt !== null) {
                    if (Date.now() - prop.deadAt >= prop.def.respawnTime) {
                        this._respawnProp(prop);
                    }
                }
                continue;
            }

            // Glow pulse
            if (prop.glowGraphic) {
                const t = (Math.sin(this._elapsed * GLOW_PULSE_SPEED + prop._phase) + 1) * 0.5;
                prop.glowGraphic.alpha = GLOW_MIN_ALPHA + t * (GLOW_MAX_ALPHA - GLOW_MIN_ALPHA);
            }

            if (prop._harvesting) {
                this._tickHarvest(prop, dt);
            }
        }

        const active =
            this._hovered ||
            this._findNearest(playerX, playerZ);

        if (active !== this._highlighted) {
            if (this._highlighted) this._hideIndicator(this._highlighted);
            this._highlighted = active;
        }

        if (this._highlighted && this._highlighted !== this._hovered) {
            this._showIndicator(this._highlighted);
        }

        if (this._hovered?.indicator) {
            this._hovered.indicator.visible = false;
        }

        for (const prop of this.allProps) {
            if (
                prop.indicator?.visible ||
                prop.barBg?.visible ||
                prop._harvesting
            ) {
                this._syncInteractUi(prop);
            }
        }
    }

    // ── Interaction API ───────────────────────────────────────────────────────

    /** @param {import('./interactablePropConfig.data.js').INTERACTABLE_PROP_TYPES[string]} def */
    _interactionDuration(def) {
        if (def.harvestTime != null && def.harvestTime > 0) {
            return def.harvestTime;
        }
        if (def.category === 'chest') return 2;
        return 0;
    }

    _beginChannel(prop, playerX, playerZ) {
        if (prop._harvesting) return null;
        prop._harvesting = true;
        prop._harvestAccum = 0;
        this._harvestAnchor = { x: playerX, z: playerZ };
        this._lastPlayerHp = useGameStore.getState().player.hp;
        this._showHarvestBar(prop);
        return { prop, loot: null, harvesting: true };
    }

    tryInteract(playerX, playerZ) {
        const prop = this._findNearest(playerX, playerZ);
        if (!prop || !prop.alive) return null;

        const duration = this._interactionDuration(prop.def);
        if (duration > 0) {
            return this._beginChannel(prop, playerX, playerZ);
        }

        return this._openProp(prop);
    }

    cancelInteract() {
        this._harvestAnchor = null;
        for (const prop of this.allProps) {
            if (prop._harvesting) {
                prop._harvesting   = false;
                prop._harvestAccum = 0;
                this._hideHarvestBar(prop);
            }
        }
    }

    _findNearest(playerX, playerZ) {
        let nearest     = null;
        let nearestDist = Infinity;

        for (const prop of this.allProps) {
            if (!prop.alive || prop._eventConsumed) continue;
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
        const id        = `${chunkKey}_${def.id}_${x.toFixed(0)}_${z.toFixed(0)}`;
        const container = new Container();
        container.x = x;
        container.y = z;
        container.sortableChildren = false;

        // ── Glow circle ──
        const glow = new Graphics();
        const glowR = (def.radius || 28) * 1.6 * scale;
        glow.circle(0, 0, glowR).fill({ color: def.glowColor ?? 0xffffff });
        glow.alpha    = GLOW_MIN_ALPHA;
        glow.blendMode = 'add';
        container.addChild(glow);

        // ── Main visual ──
        // targetSize drives both sprite scale AND shadow scale, same as PropManager
        const targetSize = def.radius * 2;

        let visual;
        let spriteScale = scale; // fallback for non-texture visuals
        const texture   = assetManager.getTexture(def.texture);

        if (texture && texture instanceof Texture) {
            visual = new Sprite(texture);
            visual.anchor.set(0.5, 1);

            // Base scale fits the sprite to targetSize (def-driven sizing).
            // Multiply by the caller-supplied `scale` so editor overrides work —
            // same pattern as PropManager.placeLoadedProp which uses userScale directly.
            const maxDim  = Math.max(texture.width, texture.height);
            spriteScale   = (targetSize / maxDim) * scale;
            visual.scale.set(spriteScale);
        } else {
            visual      = this._makeFallback(def, scale);
            spriteScale = scale;
        }

        visual.eventMode = 'static';
        visual.cursor    = 'pointer';
        container.addChild(visual);

        const heightFactor = visual instanceof Sprite ? Math.min(1.5, visual.height / 120) : 1;
        container.zIndex = computeFootSortZ(z);

        // ── Shadow ──
        // shadowManager reads propVisual.x / propVisual.y as world-space coords.
        // `visual` is a child of `container` so its .x/.y are local (0,0).
        // Pass `container` instead — it sits directly on entityLayer at (x, z).
        // zIndex must sit below the prop container (same pattern as PropManager).
// ── Simple bottom circle shadow ──

        let shadowGraphic = null;

        if (def.castShadow !== false && visual instanceof Sprite) {
            const shadow = new Graphics();

            const shadowRadius =
                Math.max(10, (def.radius || 28) * 0.65 * scale);

            shadow.circle(0, 0, shadowRadius).fill({
                color: 0x000000,
                alpha: 0.35,
            });

            // squash into ellipse
            shadow.scale.set(1, 0.25);

            // blur filter
            const blur = new BlurFilter();
            blur.strength = 6; // tweak: 3–10 usually looks good
            shadow.filters = [blur];

            shadow.alpha = 0.9; // keep higher because blur already fades it

            shadow.y = -8;

            shadow.zIndex = container.zIndex - 1;

            container.addChildAt(shadow, 0);


            shadowGraphic = shadow;
        }

        this._ensureUiLayer();

        const labelLift = visual instanceof Sprite ? visual.height : targetSize;
        const indicatorOffsetY = -(labelLift + 10);
        const barOffsetY = -(labelLift + 22);

        // ── [E] indicator (uiLayer — draws above Y-sorted props/trees) ──
        const indicator = new Text({
            text: INTERACT_KEY_LABEL + '\n' + def.label,
            style: INDICATOR_TEXT_STYLE,
        });
        indicator.anchor.set(0.5, 1);
        indicator.visible = false;
        indicator.eventMode = 'none';
        this.uiLayer.addChild(indicator);

        // ── Harvest progress bar (uiLayer) ──
        const barBg = new Graphics();
        barBg.rect(-HARVEST_BAR_W / 2, 0, HARVEST_BAR_W, HARVEST_BAR_H)
            .fill({ color: 0x111111, alpha: 0.92 })
            .stroke({ color: 0xffffff, width: 1, alpha: 0.55 });
        barBg.visible = false;
        barBg.eventMode = 'none';
        this.uiLayer.addChild(barBg);

        const barFill = new Graphics();
        barFill.visible = false;
        barFill.eventMode = 'none';
        this.uiLayer.addChild(barFill);

        this.worldObjects.addToEntityLayer(container);

        // ── Collider — optional per-type (`collision: false` in interactablePropConfig) ──
        let collider = null;
        if (def.collision !== false) {
            const colW = Math.max(20, targetSize) * 0.85;
            const colH = colW;
            collider = {
                x:                    x,
                y:                    z - colH / 2,
                width:                colW,
                height:               colH,
                collision:            true,
                type:                 'interactable',
                interactableChunkKey: chunkKey,
                visual:               container,
                sprite:               container,
            };
            this.worldObjects.addWorldCollider(collider);
        }

        // Optional additive sprite glow (texture `glow2`); set def.vfxGlow === false to skip
        let vfxGlowSprite = null;
        if (def.glowColor) {
            const gh = visual instanceof Sprite ? visual.height : targetSize;
            const oy = -Math.max(24, gh * 0.45);
            const gScale = 0.75 + (def.radius || 28) / 80;
            vfxGlowSprite = VFX.addGlow(
                0,
                oy,
                {
                    color: def.glowColor ?? 0xffffff,
                    alpha: def.vfxGlowAlpha ?? 0.15,
                    scale: def.vfxGlowScale ?? 0.45,
                    texture: def.vfxGlowTexture ?? 'glow2',
                },
                container
            );
        }

        const prop = {
            def,
            id,
            x, z,
            scale: spriteScale,
            chunkKey,
            alive:  true,
            deadAt: null,
            container,
            glowGraphic: glow,
            visual,
            indicator,
            barBg,
            barFill,
            collider,
            shadowGraphic,
            vfxGlowSprite,
            _phase: this.seededRandom(this.worldSeed ^ this.hashString(id) ^ 945612341) * Math.PI * 2,
            _harvesting:   false,
            _harvestAccum: 0,
            _uiOffsets: { indicatorY: indicatorOffsetY, barY: barOffsetY },
        };

        this._syncInteractUi(prop);

        this._attachHover(prop);
        return prop;
    }

    _attachHover(prop) {
        const visual = prop.visual;

        visual.eventMode = 'static';
        visual.cursor = 'pointer';

        visual.on('pointerover', () => {
            this._hovered = prop;
            visual.filters = [INTERACTABLE_HOVER_FILTER];
        });

        visual.on('pointerout', () => {
            if (this._hovered === prop) {
                this._hovered = null;
            }
            visual.filters = null;
        });
    }

    _isColliding(x, z, radius) {
        for (const c of this.worldObjects.colliders) {
            if (!c.collision) continue;
            const distX = Math.abs(c.x - x);
            const distZ = Math.abs(c.y - z);
            if (distX < c.width / 2 + radius && distZ < c.height / 2 + radius) return true;
        }
        return false;
    }

    /** Unregister shadow from shadowManager and remove its display object */
    _unregisterShadow(prop) {
        const shadow = prop.visual?._interactableShadow;
        if (!shadow) return;

        const sid = this.shadowRegistry.get(prop.visual);
        if (sid != null) {
            shadowManager.unregisterShadow(sid);
            this.shadowRegistry.delete(prop.visual);
        }

        if (!shadow.destroyed) {
            this.worldObjects.removeAndDestroyDisplayObject(shadow);
        }

        prop.visual._interactableShadow = null;
    }

    _disposeVfxGlow(prop) {
        if (!prop?.vfxGlowSprite) return;
        VFX.removeAttached(prop.vfxGlowSprite);
        prop.vfxGlowSprite = null;
    }

    _destroyProp(prop) {
        this._unregisterShadow(prop);
        this._disposeVfxGlow(prop);
        if (prop.collider) {
            this.worldObjects.removeCollider(prop.collider);
            prop.collider = null;
        }
        if (prop.indicator && !prop.indicator.destroyed) {
            prop.indicator.destroy();
        }
        if (prop.barBg && !prop.barBg.destroyed) {
            prop.barBg.destroy();
        }
        if (prop.barFill && !prop.barFill.destroyed) {
            prop.barFill.destroy();
        }
        this.worldObjects.removeAndDestroyDisplayObject(prop.container);
    }

    _killProp(prop) {
        prop.alive  = false;
        prop.deadAt = Date.now();
        if (prop.container) prop.container.visible = false;
        if (prop.collider)  prop.collider.collision = false;

        const shadow = prop.visual?._interactableShadow;
        if (shadow) shadow.visible = false;
        if (prop.vfxGlowSprite) prop.vfxGlowSprite.visible = false;
    }

    _respawnProp(prop) {
        prop.alive  = true;
        prop.deadAt = null;
        if (prop.container) prop.container.visible = true;
        if (prop.collider)  prop.collider.collision = true;

        const shadow = prop.visual?._interactableShadow;
        if (shadow) shadow.visible = true;
        if (prop.vfxGlowSprite) prop.vfxGlowSprite.visible = true;
    }

    // ── Interaction logic ─────────────────────────────────────────────────────

    _openProp(prop) {
        if (prop.def.category === 'event_totem') {
            return this._activateEventTotem(prop);
        }

        const lootMul = prop._lootMul ?? 1;
        const loot = this._rollLoot(prop.def.lootTable, prop.id, lootMul);

        this._playOpenAnim(prop);

        prop.alive  = false;
        prop.deadAt = Date.now();
        if (prop.collider) prop.collider.collision = false;

        if (prop.shadowGraphic) prop.shadowGraphic.visible = false;
        if (prop.vfxGlowSprite) prop.vfxGlowSprite.visible = false;

        useGameStore.getState().addOpenedInteractableId(prop.id);

        if (this.onLoot) this.onLoot(loot, prop.def, prop.x, prop.z);

        return { prop, loot };
    }

    _activateEventTotem(prop) {
        if (prop._eventConsumed) return null;

        const started = this.onEventStart?.(prop) ?? false;
        if (!started) return null;

        this._playOpenAnim(prop);
        prop.alive = false;
        prop.deadAt = Date.now();
        useGameStore.getState().addOpenedInteractableId(prop.id);

        return { prop, loot: null, eventStarted: true };
    }

    _tickHarvest(prop, dt) {
        prop._harvestAccum += dt;

        const duration = this._interactionDuration(prop.def);
        const pct = Math.min(1, prop._harvestAccum / Math.max(0.001, duration));

        if (prop.barFill) {
            prop.barFill.clear();
            prop.barFill
                .rect(-HARVEST_BAR_W / 2, 0, Math.max(2, HARVEST_BAR_W * pct), HARVEST_BAR_H)
                .fill({ color: 0x44ee44 });
            this._syncInteractUi(prop);
        }

        if (pct >= 1) {
            this._harvestAnchor = null;
            prop._harvesting   = false;
            prop._harvestAccum = 0;
            this._hideHarvestBar(prop);
            this._openProp(prop);
        }
    }

    // ── Loot rolling ─────────────────────────────────────────────────────────

    _rollLoot(tableId, basisId = '', lootMul = 1) {
        const table = getLootTables()[tableId];
        if (!table) return [];

        const basis = this.hashString(String(tableId)) ^ this.hashString(String(basisId));
        const drops = [];
        let idx = 0;

        for (const entry of table) {
            const rollSeed = this.worldSeed ^ basis ^ (idx++ * 0x9e3779b9);
            if (this.seededRandom(rollSeed) <= entry.chance) {
                const amtSeed = rollSeed + 9181;
                const span = entry.max - entry.min + 1;
                let amount = entry.min + Math.floor(this.seededRandom(amtSeed) * span);
                if (lootMul < 1 && entry.id !== 'void_essence') {
                    amount = Math.max(entry.min > 0 ? 1 : 0, Math.floor(amount * lootMul));
                }
                if (amount > 0) {
                    drops.push({ id: entry.id, amount });
                }
            }
        }
        return drops;
    }

    // ── Visual helpers ────────────────────────────────────────────────────────

    _syncInteractUi(prop) {
        if (!prop?._uiOffsets) return;
        const x = prop.x;
        const z = prop.z;
        const { indicatorY, barY } = prop._uiOffsets;

        if (prop.indicator && prop.indicator.visible) {
            prop.indicator.position.set(x, z + indicatorY);
            prop.indicator.zIndex = INTERACT_UI_Z_INDEX + 1;
        }

        if (prop.barBg?.visible) {
            prop.barBg.position.set(x, z + barY);
            prop.barBg.zIndex = INTERACT_UI_Z_INDEX + 2;
        }
        if (prop.barFill?.visible) {
            prop.barFill.position.set(x, z + barY);
            prop.barFill.zIndex = INTERACT_UI_Z_INDEX + 3;
        }
    }

    _showIndicator(prop) {
        if (prop.indicator) {
            prop.indicator.visible = true;
            this._syncInteractUi(prop);
        }
    }

    _hideIndicator(prop) {
        if (prop.indicator) prop.indicator.visible = false;
    }

    _showHarvestBar(prop) {
        if (prop.barBg)   prop.barBg.visible   = true;
        if (prop.barFill) prop.barFill.visible  = true;
        this._syncInteractUi(prop);
    }

    _hideHarvestBar(prop) {
        if (prop.barBg)   prop.barBg.visible   = false;
        if (prop.barFill) prop.barFill.visible  = false;
    }

    _playOpenAnim(prop) {
        if (!prop.container) return;
        prop.container.visible = true;

        const DURATION = 0.3;
        let startTime  = null;

        const tick = (timestamp) => {
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

    getNearestProp(playerX, playerZ, range = 120) {
        let nearest     = null;
        let nearestDist = range;

        for (const prop of this.allProps) {
            if (!prop.alive) continue;
            const d = Math.hypot(prop.x - playerX, prop.z - playerZ);
            if (d < nearestDist) { nearestDist = d; nearest = prop; }
        }

        return nearest;
    }

    getStats() {
        const stats = {};
        for (const prop of this.allProps) {
            if (!prop.alive) continue;
            const cat    = prop.def.category;
            stats[cat] = (stats[cat] || 0) + 1;
        }
        return stats;
    }

    spawnManualProp(typeId, x, z, scale = 1, chunkKey = 'editor') {
        const def = getInteractablePropTypes()[typeId];
        if (!def) return null;

        const id = `${chunkKey}_${typeId}_${x.toFixed(0)}_${z.toFixed(0)}`;
        if (useGameStore.getState().openedInteractableIds.includes(id)) return null;

        const prop = this._createProp(def, x, z, scale, chunkKey);

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
        this.allProps = this.allProps.filter(p => p !== prop);
    }

    clear() {
        for (const prop of this.allProps) {
            this._destroyProp(prop);
        }

        this.worldObjects.removeCollidersIf((c) => c.type === 'interactable');

        this.allProps = [];
        this.activeChunks.clear();
        this.shadowRegistry.clear();
        this._highlighted = null;
        this._harvestAnchor = null;
        this._elapsed     = 0;

        if (this.uiLayer && !this.uiLayer.destroyed) {
            this.uiLayer.removeChildren();
        }
    }
}