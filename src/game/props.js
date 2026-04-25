// props.js
import { Texture, Sprite, Container, Assets, Graphics } from 'pixi.js';
import { BIOME_COLORS } from './constants.js';
import { PROP_TYPES, BIOME_PROP_CONFIG } from './world/propConfig.js';
import { analyzeTexture, getOrGenerateColliders } from './world/textureAnalyzer.js';
import * as PIXI from 'pixi.js';

const NEARBY_THRESHOLD = 200;

// Cache for prop textures
const propTextureCache = new Map();

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
     * Get texture path for a prop type in a biome
     */
    getPropTexture(biome, propName) {
        const biomeData = BIOME_COLORS[biome];
        if (!biomeData?.props) return null;

        const textureMap = {
            TREE: '/testprop2.png',
            BUSH: '/bush.png',
            ROCK: '/rock.png',
            SMALL_ROCK: '/small_rock.png',
            FLOWER: '/flower.png',
            MUSHROOM: '/mushroom.png',
            CACTUS: '/cactus.png',
            ICE_PILLAR: '/ice_pillar.png',
            LAVA_ROCK: '/lava_rock.png'
        };

        const path = textureMap[propName];
        if (path && biomeData.props.includes(path)) return path;

        return biomeData.props[0] || null;
    }

    /**
     * Get or load prop texture
     */
    async getPropTextureAsset(texturePath) {
        if (propTextureCache.has(texturePath)) {
            return propTextureCache.get(texturePath);
        }

        try {
            const texture = await Assets.load(texturePath);
            propTextureCache.set(texturePath, texture);
            return texture;
        } catch (err) {
            console.warn(`Failed to load prop texture: ${texturePath}`, err);
            return null;
        }
    }

    /**
     * Check if position is valid (not too close to other props)
     */
    isValidPosition(x, z, propType, placedPositions) {
        const minDistance = propType.minDistance || 30;

        for (const existing of placedPositions) {
            const dist = Math.hypot(existing.x - x, existing.z - z);
            const existingMinDistance = existing.minDistance || 30;
            const requiredDistance = (existingMinDistance + minDistance) / 2; // Average distance

            if (dist < requiredDistance) {
                return false;
            }
        }
        return true;
    }

    /**
     * Spawn a single prop
     */
    async spawnSingleProp(x, z, propType, biome, propsArray, placedPositions, debugMode = false) {
        const texturePath = this.getPropTexture(biome, propType.name);
        if (!texturePath) return null;

        try {
            const texture = await this.getPropTextureAsset(texturePath);
            if (!texture) return null;

            const analysis = await analyzeTexture(texturePath);

            const container = new Container();
            container.x = x;
            container.y = z;

            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);

            const baseScale = 0.6 + Math.random() * 0.6;
            sprite.scale.set(baseScale);

            // Add shadow for depth
            const shadow = new Sprite(texture);
            shadow.anchor.set(0.5);
            shadow.scale.set(baseScale * 1.1, baseScale * 0.3);
            shadow.tint = 0x000000;
            shadow.alpha = 0.4;
            shadow.x = 5;
            shadow.y = 8;

            container.addChild(shadow);
            container.addChild(sprite);

            // Debug visuals
            if (debugMode) {
                const debugText = new PIXI.Text(propType.name, {
                    fontSize: 20,
                    fill: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 2,
                    align: 'center'
                });
                debugText.anchor.set(0.5);
                debugText.y = 30;
                debugText.scale.set(0.5);
                container.addChild(debugText);

                // Show min distance radius
                const distCircle = new Graphics();
                distCircle.circle(0, 0, propType.minDistance || 30)
                    .stroke({ width: 1, color: 0x00ff00, alpha: 0.5 });
                container.addChild(distCircle);

                // Show collision radius
                const collisionRadius = (analysis?.maxRadius || Math.max(texture.width, texture.height) / 2) * baseScale * (propType.margin || 0.8);
                const radiusCircle = new Graphics();
                radiusCircle.circle(0, 0, collisionRadius)
                    .stroke({ width: 1, color: 0xff0000, alpha: 0.5 });
                container.addChild(radiusCircle);
            }

            if (this.propLayer) {
                this.propLayer.addChild(container);
            } else {
                this.world.addChild(container);
            }

            // Calculate collision radius
            const actualCollisionRadius = (analysis?.maxRadius || Math.max(texture.width, texture.height) / 2) * baseScale * (propType.margin || 0.8);

            // Generate colliders
            let colliders = [];
            if (propType.collision) {
                if (propType.collisionType === 'auto' || propType.collisionType === 'pixel') {
                    colliders = await getOrGenerateColliders(texturePath, x, z, baseScale, propType);
                } else if (propType.collisionType === 'circle') {
                    colliders = [{
                        x, y: z, r: actualCollisionRadius,
                        type: 'prop',
                        propType: propType.name,
                        damageOnTouch: propType.damageOnTouch || 0
                    }];
                }

                for (const collider of colliders) {
                    this.colliders.push(collider);
                }
            }

            const visualRadius = (analysis?.maxRadius || Math.max(texture.width, texture.height) / 2) * baseScale;

            const prop = {
                container, x, z,
                type: propType.name,
                path: texturePath,
                scale: baseScale,
                visualRadius,
                collisionRadius: actualCollisionRadius,
                colliders,
                propType,
                biome,
                textureInfo: analysis
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
     * Spawn props in a chunk - SIMPLIFIED VERSION
     */
    async spawnPropsInChunk(chunkX, chunkZ, biome, chunkSize, tileSize, debugMode = false) {
        const key = `${chunkX},${chunkZ}`;


        // STRONGER CHECK - also check if we're already loading this chunk
        if (this.spawnedProps.has(key)) {
            console.warn(`⚠️ Chunk ${key} already has props! Skipping duplicate spawn.`);
            return;
        }

        // Optional: Add loading flag to prevent concurrent spawns
        if (this.loadingChunks?.has(key)) {
            console.warn(`⚠️ Chunk ${key} is already loading! Skipping.`);
            return;
        }

        if (!this.loadingChunks) this.loadingChunks = new Set();
        this.loadingChunks.add(key);


        // Reload existing props
        if (this.spawnedProps.has(key)) {
            const existingProps = this.spawnedProps.get(key);
            for (const prop of existingProps) {
                prop.container.visible = true;
                if (prop.colliders && prop.colliders.length) {
                    for (const collider of prop.colliders) {
                        if (!this.colliders.includes(collider)) {
                            this.colliders.push(collider);
                        }
                    }
                }
            }
            return;
        }

        const biomeConfig = BIOME_PROP_CONFIG[biome];
        if (!biomeConfig) return;

        // Build weighted prop list
        const propPool = [];
        for (const propDef of biomeConfig.props) {
            for (let i = 0; i < propDef.weight; i++) {
                propPool.push(PROP_TYPES[propDef.type]);
            }
        }

        const props = [];
        const chunkSizeWorld = chunkSize * tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        const seed = this.worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
        const density = biomeConfig.density;
        const maxProps = 25;
        const targetCount = Math.floor(density * maxProps);

        const placedPositions = [];
        let attempts = 0;
        let spawned = 0;
        const maxAttempts = targetCount * 30;

        while (spawned < targetCount && attempts < maxAttempts) {
            attempts++;

            // Pick random prop type based on weights
            const propType = propPool[Math.floor(this.seededRandom(seed + attempts * 53) * propPool.length)];
            if (!propType) continue;

            // Random position within chunk
            const x = startX + this.seededRandom(seed + attempts * 71) * chunkSizeWorld;
            const z = startZ + this.seededRandom(seed + attempts * 73) * chunkSizeWorld;

            // Check if position is valid
            if (!this.isValidPosition(x, z, propType, placedPositions)) {
                continue;
            }

            // Spawn the prop
            await this.spawnSingleProp(x, z, propType, biome, props, placedPositions, debugMode);
            spawned++;
        }

        console.log(`Spawned ${spawned}/${targetCount} ${biome} props in chunk ${chunkX},${chunkZ} after ${attempts} attempts`);

        // Print total props across all chunks
        let totalProps = 0;
        for (const [chunkKey, chunkProps] of this.spawnedProps) {
            totalProps += chunkProps.length;
        }
        console.log(`[DEBUG] Total props loaded: ${totalProps} across ${this.spawnedProps.size} chunks`);

        this.spawnedProps.set(key, props);
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
                prop.container.visible = false;
            }
        }
    }

    /**
     * Clear all props
     */
    clearAllProps() {
        for (const [key, props] of this.spawnedProps) {
            for (const prop of props) {
                if (prop.container.parent) {
                    prop.container.parent.removeChild(prop.container);
                }
                prop.container.destroy({ children: true });
            }
        }
        this.spawnedProps.clear();
    }
}