import { Container, Sprite } from 'pixi.js';
import { BIOME_PROP_CONFIG, PROP_TYPES } from './world/propConfig.js';
import { getOrGenerateColliders } from './world/textureAnalyzer.js';
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
        return assetManager.getTexture(id) || null;
    }

    unloadChunkProps(key) {
        const data = this.activeChunks.get(key);
        if (!data) return;

        // remove visuals
        data.container?.destroy({ children: true });
        data.shadowContainer?.destroy({ children: true });

        this.activeChunks.delete(key);
        this.chunkColliders.delete(key);
    }

    generateChunkProps(chunkX, chunkZ, biome, chunkSize, tileSize) {
        const key = `${chunkX},${chunkZ}`;

        const container = new Container();
        const shadowContainer = new Container();

        const chunkSizeWorld = chunkSize * tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        const biomeConfig = BIOME_PROP_CONFIG[biome];
        if (!biomeConfig) return container;

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

        for (let i = 0; i < targetCount * 5; i++) {
            const propType = propPool[
                Math.floor(this.seededRandom(baseSeed + i * 13) * propPool.length)
                ];

            if (!propType) continue;

            const x = startX + this.seededRandom(baseSeed + i * 17) * chunkSizeWorld;
            const z = startZ + this.seededRandom(baseSeed + i * 23) * chunkSizeWorld;

            // spacing
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

            const texture = this.getTexture(assetId);
            if (!texture) continue;

            const scaleRange = propType.scaleRange || { min: 0.6, max: 0.8 };
            const scale =
                scaleRange.min +
                this.seededRandom(baseSeed + i * 31) *
                (scaleRange.max - scaleRange.min);

            // PROP
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.scale.set(scale);
            sprite.x = x;
            sprite.y = z;

            container.addChild(sprite);

            // SHADOW
            if (this.shadowLayer) {
                const shadow = new Sprite(texture);
                shadow.anchor.set(0.5, 0.6);
                shadow.scale.set(scale, -scale);
                shadow.tint = 0x000000;
                shadow.alpha = 0.2;
                shadow.x = x - 10;
                shadow.y = z + sprite.height * scale * 0.5;

                shadowContainer.addChild(shadow);
            }

            // COLLIDER (cached per chunk)
            if (propType.collision) {
                const cols = [];
                getOrGenerateColliders(texture, x, z, scale, propType)
                    .then(c => {
                        cols.push(...c);
                        this.colliders.push(...c);
                    });

                colliders.push(...cols);
            }

            placed.push({ x, z });
        }

        if (this.propLayer) this.propLayer.addChild(container);
        if (this.shadowLayer) this.shadowLayer.addChild(shadowContainer);

        const result = { container, shadowContainer };

        this.activeChunks.set(key, result);
        this.chunkColliders.set(key, colliders);

        return result;
    }
}