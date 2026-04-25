// props.js - FIXED to use assetManager exclusively

import { Texture, Sprite, Container, Assets, Graphics } from 'pixi.js';
import { BIOME_COLORS } from './constants.js';
import { PROP_TYPES, BIOME_PROP_CONFIG } from './world/propConfig.js';
import { analyzeTexture, getOrGenerateColliders } from './world/textureAnalyzer.js';
import * as PIXI from 'pixi.js';
import { assetManager } from './utils/assetManager.js'; // IMPORT assetManager

const NEARBY_THRESHOLD = 200;

// Cache for analyzed textures (not for loading)
const analysisCache = new Map();

/**
 * Returns only colliders within NEARBY_THRESHOLD of (ex, ey)
 */
export function nearbyColliders(colliders, ex, ey, threshold = NEARBY_THRESHOLD) {
    return colliders.filter(c => Math.hypot(c.x - ex, c.y - ey) < threshold + (c.r || 0));
}

/**
 * Prop Manager class to handle all prop-related logic
 */
export class PropManager {
    constructor(world, colliders, worldSeed = 1) {
        this.world = world;
        this.colliders = colliders;
        this.worldSeed = worldSeed;
        this.spawnedProps = new Map();
        this.propLayer = null;
    }

    setPropLayer(layer) {
        this.propLayer = layer;
    }

    /**
     * Get texture from assetManager (NO LOADING)
     */
    getTextureFromManager(textureId) {
        const texture = assetManager.getTexture(textureId);
        if (!texture) {
            console.error(`Texture not found in assetManager: ${textureId}`);
        }
        return texture || null;
    }

    /**
     * Get texture path for a prop type in a biome - returns asset ID, not file path
     */
    getPropAssetId(biome, propName) {
        return propName || null;
    }

    /**
     * Check if position is valid (not too close to other props)
     */
    isValidPosition(x, z, propType, placedPositions) {
        const minDistance = propType.minDistance || 30;

        for (const existing of placedPositions) {
            const dist = Math.hypot(existing.x - x, existing.z - z);
            const existingMinDistance = existing.minDistance || 30;
            const requiredDistance = (existingMinDistance + minDistance) / 2;

            if (dist < requiredDistance) {
                return false;
            }
        }
        return true;
    }

    /**
     * Spawn a single prop - USES ASSETMANAGER ONLY
     */
// In props.js - Update spawnSingleProp to work with texture analyzer

    async spawnSingleProp(x, z, propType, biome, propsArray, placedPositions, debugMode = false) {
        try {
            let texture;
            let assetId;
            let variantName;

            if (propType.variants && propType.variants.length > 0) {
                variantName = propType.variants[Math.floor(Math.random() * propType.variants.length)];
                assetId = this.getPropAssetId(biome, variantName);
                texture = this.getTextureFromManager(assetId);
            } else {
                assetId = this.getPropAssetId(biome, propType.name);
                texture = this.getTextureFromManager(assetId);
            }

            if (!texture) {
                return null;
            }

            const container = new Container();
            container.x = x;
            container.y = z;

            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);

            const scaleRange = propType.scaleRange || { min: 0.6, max: 0.8 };
            const baseScale = scaleRange.min + Math.random() * (scaleRange.max - scaleRange.min);
            sprite.scale.set(baseScale);

            // Add shadow
            const shadow = new Sprite(texture);
            shadow.anchor.set(0.5, 0.6);

            // 🔥 mirror vertically (this is the key)
            shadow.scale.set(baseScale, -baseScale);

            shadow.tint = 0x000000;
            shadow.alpha = 0.4;

            // move it below the sprite (ground)
            shadow.y = sprite.height * baseScale * 0.5; // tweak if needed

            container.addChild(shadow);
            container.addChild(sprite);

            if (this.propLayer) {
                this.propLayer.addChild(container);
            } else {
                this.world.addChild(container);
            }

            // Generate pixel-perfect colliders based on actual texture shape
            let colliders = [];
            if (propType.collision && (propType.collisionType === 'auto' || propType.collisionType === 'pixel')) {
                // Pass the texture object directly (not a path)
                colliders = await getOrGenerateColliders(texture, x, z, baseScale, propType);
                for (const collider of colliders) {
                    this.colliders.push(collider);
                }
            }

            const prop = {
                container, x, z,
                type: propType.name,
                variant: variantName,
                scale: baseScale,
                texture: texture,
                colliders,
                propType,
                biome
            };

            propsArray.push(prop);

            placedPositions.push({
                x, z,
                minDistance: propType.minDistance || 30,
                type: propType.name
            });

            return prop;

        } catch (err) {
            console.warn(`Failed to spawn prop: ${propType.name}`, err);
            return null;
        }
    }

    /**
     * Seeded random function
     */
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Spawn props in a chunk
     */
    async spawnPropsInChunk(chunkX, chunkZ, biome, chunkSize, tileSize, debugMode = false) {
        const key = `${chunkX},${chunkZ}`;

        if (this.spawnedProps.has(key)) {
            console.warn(`⚠️ Chunk ${key} already has props! Skipping duplicate spawn.`);
            return;
        }

        if (this.loadingChunks?.has(key)) {
            console.warn(`⚠️ Chunk ${key} is already loading! Skipping.`);
            return;
        }

        if (!this.loadingChunks) this.loadingChunks = new Set();
        this.loadingChunks.add(key);

        try {
            const biomeConfig = BIOME_PROP_CONFIG[biome];
            if (!biomeConfig) {
                console.warn(`No prop config for biome: ${biome}`);
                return;
            }

            // Build weighted prop list
            const propPool = [];
            for (const propDef of biomeConfig.props) {
                for (let i = 0; i < propDef.weight; i++) {
                    const propType = PROP_TYPES[propDef.type];
                    if (propType) {
                        propPool.push(propType);
                    }
                }
            }

            if (propPool.length === 0) {
                console.warn(`No valid props for biome: ${biome}`);
                return;
            }

            const props = [];
            const chunkSizeWorld = chunkSize * tileSize;
            const startX = chunkX * chunkSizeWorld;
            const startZ = chunkZ * chunkSizeWorld;

            const seed = this.worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
            const density = biomeConfig.density || 0.5;
            const maxProps = 25;
            const targetCount = Math.floor(density * maxProps);

            console.log(`Spawning ${targetCount} props for ${biome} in chunk ${chunkX},${chunkZ}`);

            const placedPositions = [];
            let attempts = 0;
            let spawned = 0;
            const maxAttempts = targetCount * 30;

            while (spawned < targetCount && attempts < maxAttempts) {
                attempts++;

                const propType = propPool[Math.floor(this.seededRandom(seed + attempts * 53) * propPool.length)];
                if (!propType) continue;

                const x = startX + this.seededRandom(seed + attempts * 71) * chunkSizeWorld;
                const z = startZ + this.seededRandom(seed + attempts * 73) * chunkSizeWorld;

                if (!this.isValidPosition(x, z, propType, placedPositions)) {
                    continue;
                }

                await this.spawnSingleProp(x, z, propType, biome, props, placedPositions, debugMode);
                spawned++;
            }

            console.log(`Spawned ${spawned}/${targetCount} ${biome} props in chunk ${chunkX},${chunkZ} after ${attempts} attempts`);

            this.spawnedProps.set(key, props);

        } finally {
            this.loadingChunks.delete(key);
        }
    }

    /**
     * Get all spawned props
     */
    getProps() {
        const allProps = [];
        for (const props of this.spawnedProps.values()) {
            for (const prop of props) {
                if (prop.container.visible) {
                    allProps.push(prop);
                }
            }
        }
        return allProps;
    }

    /**
     * Unload props for a chunk
     */
    unloadChunkProps(key) {
        const props = this.spawnedProps.get(key);
        if (props) {
            for (const prop of props) {
                if (prop.colliders && prop.colliders.length) {
                    for (const collider of prop.colliders) {
                        const colliderIndex = this.colliders.indexOf(collider);
                        if (colliderIndex > -1) {
                            this.colliders.splice(colliderIndex, 1);
                        }
                    }
                }
                if (prop.container) {
                    prop.container.visible = false;
                }
            }
        }
    }

    /**
     * Clear all props
     */
    clearAllProps() {
        for (const [key, props] of this.spawnedProps) {
            for (const prop of props) {
                if (prop.container && prop.container.parent) {
                    prop.container.parent.removeChild(prop.container);
                    prop.container.destroy({ children: true });
                }
            }
        }
        this.spawnedProps.clear();
    }
}