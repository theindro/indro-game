import { Container, Sprite, Graphics, Texture } from 'pixi.js';
import { BIOME_PROP_CONFIG, PROP_TYPES } from './world/propConfig.js';
import { assetManager } from './utils/assetManager.js';

export class PropManager {
    constructor(world, colliders, worldSeed = 1) {
        this.world = world;
        this.colliders = colliders;
        this.worldSeed = worldSeed;

        this.propLayer = null;
        this.shadowLayer = null;

        // runtime only
        this.activeChunks = new Map();     // visuals only
        this.chunkColliders = new Map();   // collision only
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

        // remove visuals
        if (data.container) {
            data.container.destroy({ children: true });
        }
        if (data.shadowContainer) {
            data.shadowContainer.destroy({ children: true });
        }

        // remove colliders from main array
        const colliders = this.chunkColliders.get(key);
        if (colliders && this.colliders) {
            for (const collider of colliders) {
                const index = this.colliders.indexOf(collider);
                if (index > -1) {
                    this.colliders.splice(index, 1);
                }
            }
        }

        this.activeChunks.delete(key);
        this.chunkColliders.delete(key);
    }

    async generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize) {
        const key = `${chunkX},${chunkZ}`;

        // Check if already generated
        if (this.activeChunks.has(key)) {
            console.log(`Props already exist for chunk ${key}`);
            return this.activeChunks.get(key);
        }

        const container = new Container();
        const shadowContainer = new Container();

        const chunkSizeWorld = chunkSize * tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        const biomeConfig = BIOME_PROP_CONFIG[biome];
        if (!biomeConfig) {
            console.warn(`No prop config for biome: ${biome}`);
            return { container, shadowContainer };
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
        const colliders = [];

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

            // ✅ FIX 1: Create fallback graphics if texture is missing
            if (!texture) {
                console.log(`Creating fallback graphic for ${assetId}`);
                texture = this.createFallbackTexture(propType, biome);
            }

            const scaleRange = propType.scaleRange || { min: 0.6, max: 0.8 };
            const scale =
                scaleRange.min +
                this.seededRandom(baseSeed + i * 31) *
                (scaleRange.max - scaleRange.min);

            // ✅ FIX 2: Handle both Sprite and Graphics
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

            propVisual.x = x;
            propVisual.y = z;

            container.addChild(propVisual);

            // Add shadow
            if (this.shadowLayer && propVisual instanceof Sprite) {
                const shadow = new Sprite(propVisual.texture);
                shadow.anchor.set(0.5, 0.6);
                shadow.scale.set(scale, -scale);
                shadow.tint = 0x000000;
                shadow.alpha = 0.15;
                shadow.x = x - 5;
                shadow.y = z + (propVisual.height * scale * 0.5);
                shadowContainer.addChild(shadow);
            }

            // ✅ FIX 3: Create collider synchronously
            if (propType.collision) {
                const collider = {
                    x: x,
                    y: z,
                    width: Math.max(20, propVisual.width || 30),
                    height: Math.max(20, propVisual.height || 30),
                    collision: true,
                    type: 'prop',
                    propType: propType.type,
                    biome: biome
                };

                colliders.push(collider);

                // Add to main colliders array
                if (this.colliders) {
                    this.colliders.push(collider);
                }
            }

            placed.push({ x, z });
            actualCount++;
        }

        // Add to layers
        if (this.propLayer) {
            this.propLayer.addChild(container);
        } else {
            console.error("❌ propLayer is null!");
        }

        if (this.shadowLayer && shadowContainer.children.length > 0) {
            this.shadowLayer.addChild(shadowContainer);
        }

        const result = { container, shadowContainer };

        this.activeChunks.set(key, result);
        this.chunkColliders.set(key, colliders);

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