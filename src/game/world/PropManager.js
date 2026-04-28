import { Container, Sprite, Graphics, Texture, Text } from 'pixi.js';
import { BIOME_PROP_CONFIG, PROP_TYPES } from './propConfig.js';
import { assetManager } from '../utils/assetManager.js';

export class PropManager {
    constructor(world, colliders, worldSeed = 1) {
        this.world = world;
        this.colliders = colliders;
        this.worldSeed = worldSeed;

        this.propLayer = null;
        this.shadowLayer = null;

        // runtime only
        this.activeChunks = new Map();     // visuals only
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

    unloadChunkProps(key) {
        const data = this.activeChunks.get(key);
        if (!data) return;

        // Remove all props in this chunk from entityLayer
        if (data.propsList) {
            for (const prop of data.propsList) {
                if (prop && prop.parent) {
                    prop.parent.removeChild(prop);
                    prop.destroy({ children: true });
                }
            }
        }

        // Remove colliders with matching chunkKey
        if (this.colliders) {
            for (let i = this.colliders.length - 1; i >= 0; i--) {
                if (this.colliders[i].chunkKey === key) {
                    this.colliders.splice(i, 1);
                }
            }
        }

        this.activeChunks.delete(key);
    }

    async generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize) {
        const key = `${chunkX},${chunkZ}`;

        // Check if already generated
        if (this.activeChunks.has(key)) {
            console.log(`Props already exist for chunk ${key}`);
            return this.activeChunks.get(key);
        }

        // DON'T create a container for props - we'll add directly to propLayer
        const propsList = []; // Store references to cleanup later

        const chunkSizeWorld = chunkSize * tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        const biomeConfig = BIOME_PROP_CONFIG[biome];
        if (!biomeConfig) {
            console.warn(`No prop config for biome: ${biome}`);
            return { propsList }; // Return empty
        }

        // Build prop pool based on weights
        const propPool = [];
        for (const def of biomeConfig.props) {
            const type = PROP_TYPES[def.type];
            if (!type) continue;

            for (let i = 0; i < def.weight; i++) {
                propPool.push(type);
            }
        }

        const placed = [];
        const baseSeed = this.hash(chunkX, chunkZ);
        const targetCount = Math.floor((biomeConfig.density || 0.5) * 25);
        let actualCount = 0;

        for (let i = 0; i < targetCount * 5 && actualCount < targetCount; i++) {
            const propType = propPool[
                Math.floor(this.seededRandom(baseSeed + i * 13) * propPool.length)
                ];

            if (!propType) continue;

            const x = startX + this.seededRandom(baseSeed + i * 17) * chunkSizeWorld;
            const z = startZ + this.seededRandom(baseSeed + i * 23) * chunkSizeWorld;

            // Check spacing
            let ok = true;
            for (const p of placed) {
                if (Math.hypot(p.x - x, p.z - z) < (propType.minDistance || 30)) {
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;

            const assetId = propType.variants?.length
                ? propType.variants[
                    Math.floor(this.seededRandom(baseSeed + i * 29) * propType.variants.length)
                    ]
                : propType.name;

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
            const BASE_OFFSET_X = -25;
            const BASE_OFFSET_Y = -0 * heightFactor;

            // CRITICAL: Set zIndex to Y position (no offset)
            propVisual.zIndex = propVisual.y - (40 * heightFactor);

            // Store chunk key for cleanup
            propVisual.chunkKey = key;

            // ADD DIRECTLY TO PROP LAYER (entityLayer)
            if (this.propLayer) {
                this.propLayer.addChild(propVisual);
            }

            // Add shadow if needed
            if (this.shadowLayer && propVisual instanceof Sprite) {
                const shadow = new Sprite(propVisual.texture);
                shadow.anchor.set(0.5, 0.5);
                shadow.x = propVisual.x + BASE_OFFSET_X * (1 + heightFactor);
                shadow.y = propVisual.y + BASE_OFFSET_Y;
                shadow.scale.set(scale * 1.0, -scale * (0.4 + heightFactor * 0.2));
                shadow.skew.x = -0.3 - heightFactor * 0.4;
                shadow.tint = 0x000000;
                shadow.alpha = 0.12;
                shadow.chunkKey = key;
                this.shadowLayer.addChild(shadow);
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
                    visual: propVisual // Store reference for cleanup
                };

                if (this.colliders) {
                    this.colliders.push(collider);
                }
            }

            propsList.push(propVisual);
            placed.push({ x, z });
            actualCount++;
        }

        // Store just the list of props for this chunk
        const result = { propsList };
        this.activeChunks.set(key, result);

        console.log(`Chunk ${chunkX},${chunkZ} added ${actualCount} props directly to entityLayer`);

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
}