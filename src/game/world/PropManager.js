import { Sprite, Graphics, Texture, AnimatedSprite } from 'pixi.js';
import { getPropTypes, getPropTypeByAssetId } from './propConfig.js';
import { assetManager } from '../utils/assetManager.js';
import { shadowManager } from '../controllers/createShadowController.js';
import { computeFootSortZ } from './sortDepth.js';
import {
    pickChunkProfile,
    buildPropPool,
    pickVariantAssetId,
    getSpacingDistance,
    getTargetPropCount,
    computeLayoutAnchors,
    usesArenaLayout,
} from './chunkProfile.js';
import { samplePropPosition } from './chunkPlacement.js';
import { PLAYER_RADIUS } from '../constants.js';

/** Alpha for non-colliding props when the player walks behind them. */
const OCCLUSION_FADE_ALPHA = 0.5;

export class PropManager {
    constructor(worldObjects, worldSeed = 1) {
        this.worldObjects = worldObjects;
        this.worldSeed = worldSeed;

        this.propLayer = null;
        this.shadowLayer = null;

        // runtime only
        this.activeChunks = new Map();     // visuals only

        // Store shadow registration IDs (prop visual -> shadowManager id)
        this.shadowRegistry = new Map();
    }

    /** Authoritative id + chunk for save / editor (set on every placed prop visual). */
    tagWorldProp(visual, id, chunkKey) {
        if (!visual) return;
        visual.worldPropRecord = { id, chunkKey };
        visual.chunkKey = chunkKey;
    }

    /** All prop visuals, outer chunks arbitrary, inner lists reverse order (for pick top-first). */
    collectAllPropVisualsReversed() {
        const out = [];
        for (const [, data] of this.activeChunks) {
            const list = data?.propsList || [];
            for (let i = list.length - 1; i >= 0; i--) out.push(list[i]);
        }
        return out;
    }

    /** @param {import('pixi.js').Sprite | import('pixi.js').Graphics} visual */
    _enableOcclusionFade(visual) {
        if (!visual) return;
        visual.occlusionFade = true;
        if (visual._occlusionFullAlpha == null) {
            visual._occlusionFullAlpha = visual.alpha ?? 1;
        }
    }

    /**
     * Fade non-colliding props (trees, bushes) when they draw in front of the player.
     * @param {number} playerX
     * @param {number} playerY World Y used for overlap (bobbed position matches zIndex).
     * @param {number} playerSortZ Player zIndex / sort depth.
     */
    updatePlayerOcclusion(playerX, playerY, playerSortZ) {
        for (const [, data] of this.activeChunks) {
            for (const visual of data?.propsList || []) {
                if (!visual?.occlusionFade || visual.destroyed) continue;

                const fade = this._shouldOccludePlayer(visual, playerX, playerY, playerSortZ);
                const full = visual._occlusionFullAlpha ?? 1;
                const target = fade ? OCCLUSION_FADE_ALPHA : full;

                if (Math.abs(visual.alpha - target) > 0.01) {
                    visual.alpha = target;
                }
            }
        }
    }

    /**
     * @param {import('pixi.js').Sprite | import('pixi.js').Graphics} visual
     */
    _shouldOccludePlayer(visual, playerX, playerY, playerSortZ) {
        const propSortZ = visual.zIndex ?? visual.y;
        if (propSortZ <= playerSortZ + 1) return false;

        // Player is north of the prop base (behind the canopy in Y-sort space).
        if (playerY > visual.y - 6) return false;

        const w = Math.max(Math.abs(visual.width || 0), 24);
        const h = Math.max(Math.abs(visual.height || 0), 32);
        const ax = visual.anchor?.x ?? 0.5;
        const ay = visual.anchor?.y ?? 1;

        const left = visual.x - w * ax;
        const right = visual.x + w * (1 - ax);
        const top = visual.y - h * ay;
        const bottom = visual.y + h * (1 - ay);
        const pad = PLAYER_RADIUS * 0.85;

        return (
            playerX + pad > left &&
            playerX - pad < right &&
            playerY + pad > top &&
            playerY - pad < bottom
        );
    }

    /**
     * Screen-space hit test in world coordinates (same space as editor getWorldPos).
     * Returns the top-most prop sprite/graphics under the point, or null.
     */
    hitTestPropAt(worldX, worldY) {
        const pos = { x: worldX, y: worldY };
        const margin = 10;
        for (const spr of this.collectAllPropVisualsReversed()) {
            if (!spr || spr.destroyed) continue;
            const w = Math.max(Math.abs(spr.width || 0), 28);
            const h = Math.max(Math.abs(spr.height || 0), 28);
            const ax = spr.anchor?.x ?? 0.5;
            const ay = spr.anchor?.y ?? 1;
            const left = spr.x - w * ax - margin;
            const right = spr.x + w * (1 - ax) + margin;
            const top = spr.y - h * ay - margin;
            const bottom = spr.y + h * (1 - ay) + margin;
            if (pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) {
                return spr;
            }
        }
        return null;
    }

    _unregisterShadowForVisual(visual) {
        const sid = this.shadowRegistry.get(visual);
        if (sid == null) return;
        shadowManager.unregisterShadow(sid);
        this.shadowRegistry.delete(visual);
    }

    /**
     * Remove one decorative prop (procedural, loaded JSON, or editor): sprite, shadow, colliders, chunk lists.
     */
    removePropVisual(visual) {
        if (!visual || (!visual.worldPropRecord && !visual.chunkKey)) {
            return false;
        }
        const chunkKey = visual.worldPropRecord?.chunkKey ?? visual.chunkKey;
        const data = this.activeChunks.get(chunkKey);

        this._unregisterShadowForVisual(visual);

        const linkedShadow = visual._worldPropShadow;
        if (linkedShadow && !linkedShadow.destroyed) {
            this.worldObjects.removeAndDestroyDisplayObject(linkedShadow);
            if (data?.shadowsList) {
                const si = data.shadowsList.indexOf(linkedShadow);
                if (si !== -1) data.shadowsList.splice(si, 1);
            }
        }
        visual._worldPropShadow = null;

        if (data?.propsList) {
            const idx = data.propsList.indexOf(visual);
            if (idx !== -1) data.propsList.splice(idx, 1);
        }

        this.worldObjects.removeCollidersIf(
            (c) => c.type === 'prop' && (c.sprite === visual || c.visual === visual)
        );

        this.worldObjects.removeAndDestroyDisplayObject(visual);

        if (data && (!data.propsList?.length && !data.shadowsList?.length)) {
            this.activeChunks.delete(chunkKey);
        }
        return true;
    }

    /**
     * Serialize every placed prop for world JSON (sprite x/y = saved position; no collider center drift).
     */
    serializePropsForWorldJson(chunkSize, tileSize) {
        const chunks = new Map();
        const chunkWorld = chunkSize * tileSize;

        for (const [chunkKey, data] of this.activeChunks) {
            for (const spr of data.propsList || []) {
                const rec = spr.worldPropRecord;
                if (!rec?.id) continue;

                const chunkX = Math.floor(spr.x / chunkWorld);
                const chunkZ = Math.floor(spr.y / chunkWorld);
                const key = `${chunkX},${chunkZ}`;

                if (!chunks.has(key)) {
                    chunks.set(key, {
                        chunkX,
                        chunkZ,
                        props: []
                    });
                }
                chunks.get(key).props.push({
                    id: rec.id,
                    x: spr.x,
                    y: spr.y,
                    scale: spr.scale?.x ?? 1,
                    rotation: spr.rotation ?? 0,
                    collision: spr.editorData?.collidable,
                });
            }
        }
        return chunks;
    }

    setPropLayer(layer) {
        this.propLayer = layer;
    }

    setShadowLayer(layer) {
        this.shadowLayer = layer;
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    hash(cx, cz, extra = 0) {
        return this.worldSeed
            ^ (cx * 73856093)
            ^ (cz * 19349663)
            ^ (extra * 83492791);
    }

    getTexture(id) {
        const texture = assetManager.getTexture(id);
        if (!texture) {
            console.warn(`⚠️ Texture not found: ${id}`);
        }
        return texture;
    }

    /**
     * Place one prop from saved world / editor JSON (matches procedural visuals, shadows, colliders).
     */
    placeLoadedProp(p, chunkKey, biome) {
        const x = p.x;
        const z = p.y;
        const userScale = p.scale ?? 1;
        const propType = getPropTypeByAssetId(p.id);

        const propVisual = assetManager.createRenderable(p.id, false);
        if (!propVisual) {
            console.warn(`[PropManager] Missing asset for prop id: ${p.id}`);
            return;
        }

        propVisual.editorData = {
            collidable: p.collision,
        };

        if (propVisual instanceof AnimatedSprite) {
            propVisual.play?.();
        }

        propVisual.x = x;
        propVisual.y = z;
        propVisual.scale.set(userScale);

        if (propVisual.anchor?.set) {
            propVisual.anchor.set(0.5, 1);
        }

        const heightFactor = Math.min(1.5, propVisual.height / 120);
        propVisual.zIndex = computeFootSortZ(propVisual.y);
        propVisual.chunkKey = chunkKey;
        this.tagWorldProp(propVisual, p.id, chunkKey);
        if (p.rotation != null) propVisual.rotation = p.rotation;

        if (this.propLayer) {
            this.worldObjects.addToEntityLayer(propVisual);
        }

        let entry = this.activeChunks.get(chunkKey);
        if (!entry) {
            entry = { propsList: [], shadowsList: [] };
            this.activeChunks.set(chunkKey, entry);
        }
        entry.propsList.push(propVisual);

        const scaleForShadow = propVisual.scale?.x ?? userScale;

        if (this.shadowLayer && propVisual instanceof Sprite) {
            const shadow = new Sprite(propVisual.texture);
            shadow.anchor.set(0.5, 1);
            shadow.tint = 0x000000;
            shadow.chunkKey = chunkKey;

            const shadowId = shadowManager.registerShadow(
                shadow,
                propVisual,
                scaleForShadow,
                heightFactor
            );

            shadow.zIndex = propVisual.zIndex - 10;
            this.shadowRegistry.set(propVisual, shadowId);
            this.worldObjects.addToEntityLayer(shadow);
            shadow._propVisual = propVisual;
            propVisual._worldPropShadow = shadow;
            entry.shadowsList.push(shadow);
        }

        const wantsCollision =
            p.collision !== undefined
                ? p.collision
                : (propType ? propType.collision : true);

        if (!wantsCollision) {
            this._enableOcclusionFade(propVisual);
        }

        if (wantsCollision) {
            const baseWidth = Math.max(20, propVisual.width || 30);
            const baseHeight = Math.max(20, propVisual.height || 30);
            const width = baseWidth * 0.85;
            const height = baseHeight * 0.85;

            this.worldObjects.addWorldCollider({
                x,
                y: z - height / 2,
                width,
                height,
                collision: true,
                type: 'prop',
                propType: propType?.type ?? 'loaded',
                biome,
                chunkKey,
                id: p.id,
                visual: propVisual,
                sprite: propVisual
            });
        }

        return propVisual;
    }

    unloadChunkProps(key) {
        const data = this.activeChunks.get(key);
        if (!data) {
            this.worldObjects.removeCollidersIf((c) => c.chunkKey === key && c.type === 'prop');
            return;
        }

        const visuals = [...(data.propsList || [])];
        for (const v of visuals) {
            this.removePropVisual(v);
        }

        this.worldObjects.removeCollidersIf((c) => c.chunkKey === key && c.type === 'prop');
        this.activeChunks.delete(key);
    }

    /**
     * Place fixed arena props from chunk profile (boss grove, etc.).
     */
    generateArenaProps(chunkX, chunkZ, biome, chunkSizeWorld, placements, chunkKey) {
        const propsList = [];
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        for (const slot of placements) {
            const x = startX + slot.nx * chunkSizeWorld;
            const z = startZ + slot.nz * chunkSizeWorld;
            const spr = this.placeLoadedProp(
                {
                    id: slot.assetId,
                    x,
                    y: z,
                    scale: slot.scale ?? 1,
                    rotation: 0,
                    collision: slot.collision !== false,
                },
                chunkKey,
                biome
            );
            if (spr) propsList.push(spr);
        }

        const result = { propsList, shadowsList: [], profileId: 'arena' };
        this.activeChunks.set(chunkKey, result);
        return result;
    }

    async generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize, landscapeContext = null) {
        const key = `${chunkX},${chunkZ}`;

        if (this.activeChunks.has(key)) {
            return this.activeChunks.get(key);
        }

        const propsList = [];
        const shadowsList = [];

        const chunkSizeWorld = chunkSize * tileSize;

        const profile =
            landscapeContext?.profile ??
            pickChunkProfile(biome, chunkX, chunkZ, this.worldSeed);

        const anchors =
            landscapeContext?.anchors ??
            computeLayoutAnchors(profile, chunkX, chunkZ, this.worldSeed, chunkSizeWorld);

        if (usesArenaLayout(profile)) {
            return this.generateArenaProps(
                chunkX,
                chunkZ,
                biome,
                chunkSizeWorld,
                profile.arenaPlacements,
                key
            );
        }

        const propTypes = getPropTypes();
        const propPool = buildPropPool(profile, propTypes);

        if (propPool.length === 0) {
            return { propsList };
        }

        const placed = [];
        const baseSeed = this.hash(chunkX, chunkZ);
        const densityMul = landscapeContext?.contentScales?.landscapeDensityMul ?? 1;
        const targetCount = Math.max(0, Math.round(getTargetPropCount(profile) * densityMul));
        let actualCount = 0;

        for (let i = 0; i < targetCount * 8 && actualCount < targetCount; i++) {
            const entry = propPool[Math.floor(this.seededRandom(baseSeed + i * 13) * propPool.length)];
            const propType = entry.propType;
            const typeKey = entry.typeKey;

            if (!propType) continue;

            const pos = samplePropPosition(anchors, typeKey, baseSeed + i * 41);
            const x = pos.x;
            const z = pos.z;

            const minDist = getSpacingDistance(profile, typeKey, propType);
            let ok = true;
            for (const p of placed) {
                if (Math.hypot(p.x - x, p.z - z) < Math.max(minDist, p.minDist ?? 0)) {
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;

            const assetId = pickVariantAssetId(profile, propType, baseSeed + i * 29);

            let texture = this.getTexture(assetId);

            if (!texture) {
                console.log(`Creating fallback graphic for ${assetId}`);
                texture = this.createFallbackTexture(propType, biome);
            }

            const scaleRange = propType.scaleRange || { min: 0.6, max: 0.8 };
            const scale =
                scaleRange.min +
                this.seededRandom(baseSeed + i * 31) *
                (scaleRange.max - scaleRange.min);

            let propVisual;
            if (texture instanceof Texture) {
                propVisual = new Sprite(texture);
                propVisual.anchor.set(0.5);
                propVisual.scale.set(scale);
            } else if (texture instanceof Graphics) {
                propVisual = texture;
                propVisual.scale.set(scale);
            } else {
                propVisual = this.createFallbackTexture(propType, biome);
                if (propVisual instanceof Graphics) {
                    propVisual.scale.set(scale);
                }
            }

            propVisual.anchor.set(0.5, 1);
            propVisual.x = x;
            propVisual.y = z;

            const heightFactor = Math.min(1.5, propVisual.height / 120);

            propVisual.zIndex = computeFootSortZ(propVisual.y);

            // Store chunk key for cleanup
            propVisual.chunkKey = key;
            this.tagWorldProp(propVisual, assetId, key);

            // ADD DIRECTLY TO PROP LAYER (entityLayer)
            if (this.propLayer) {
                this.worldObjects.addToEntityLayer(propVisual);
            }

            // Add shadow if needed
            if (this.shadowLayer && propVisual instanceof Sprite) {
                const shadow = new Sprite(propVisual.texture);
                shadow.anchor.set(0.5, 1);
                shadow.tint = 0x000000;
                shadow.chunkKey = key;

                // Register with ShadowManager
                const shadowId = shadowManager.registerShadow(
                    shadow,
                    propVisual,
                    scale,
                    heightFactor
                );

                shadow.zIndex = propVisual.zIndex - 10;

                // Store registration for cleanup
                this.shadowRegistry.set(propVisual, shadowId);

                // Add to shadow layer
                this.worldObjects.addToEntityLayer(shadow);
                shadow._propVisual = propVisual;
                propVisual._worldPropShadow = shadow;
                shadowsList.push(shadow);
            }

            if (!propType.collision) {
                this._enableOcclusionFade(propVisual);
            }

            // Create collider
            if (propType.collision) {
                const baseWidth = Math.max(20, propVisual.width || 30);
                const baseHeight = Math.max(20, propVisual.height || 30);
                const width = baseWidth * 0.85;
                const height = baseHeight * 0.85;

                const collider = {
                    x: x,
                    y: z - height / 2,
                    width,
                    height,
                    collision: true,
                    type: 'prop',
                    propType: propType.type,
                    biome: biome,
                    chunkKey: key,
                    visual: propVisual,
                    sprite: propVisual
                };

                this.worldObjects.addWorldCollider(collider);
            }

            propsList.push(propVisual);
            placed.push({ x, z, minDist });
            actualCount++;
        }

        const result = { propsList, shadowsList, profileId: profile.id, profileLabel: profile.label };
        this.activeChunks.set(key, result);

        return result;
    }

    // ✅ FIX 4: Create fallback visual for missing textures
    createFallbackTexture(propType, biome) {
        const graphics = new Graphics();
        const size = 30;
        const color = this.getPropColor(biome, propType);

        graphics.rect(-size/2, -size/2, size, size);
        graphics.fill({ color: color });
        graphics.stroke({ color: 0x000000, width: 1 });

        return graphics;
    }

    getPropColor(biome, propType) {
        const colors = {
            forest: { tree: 0x4CAF50, rock: 0x8B7355, bush: 0x6B8E23 },
            desert: { cactus: 0x228B22, rock: 0xC2B280, dune: 0xEDC9AF },
            ice: { ice: 0xADD8E6, rock: 0x87CEEB, crystal: 0xE0FFFF },
            lava: { rock: 0x8B0000, crystal: 0xFF4500, ember: 0xFF8C00 }
        };

        const biomeColors = colors[biome] || colors.forest;
        return biomeColors[propType?.type] || 0x808080;
    }

    clear() {
        const keys = [...this.activeChunks.keys()];
        for (const key of keys) {
            this.unloadChunkProps(key);
        }
        this.shadowRegistry.clear();
    }
}