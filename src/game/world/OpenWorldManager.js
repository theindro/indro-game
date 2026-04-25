// world/OpenWorldManager.js
import {Container, Graphics, Sprite, Assets, TilingSprite, BlurFilter} from 'pixi.js';
import {spawnMob} from '../controllers/createMobController.js';
import {MOB_RADIUS, BIOME_COLORS} from '../constants.js';
import {PropManager} from "../props.js";

export class OpenWorldManager {
    constructor(world, colliders) {
        this.world = world;
        this.colliders = colliders;
        this.chunkSize = 32;
        this.tileSize = 64;
        this.renderDistance = 1;
        this.loadedChunks = new Map();
        this.spawnedEntities = new Map();
        this.lastPlayerChunk = {x: 0, z: 0};
        this.worldBounds = {
            minX: -200000,
            maxX: 200000,
            minY: -200000,
            maxY: 200000
        };
        this.entitiesList = null;
        this.initialized = false;
        this.worldSeed = Math.random() * 5021;// make configurable

        this.config = {
            biomeScale: 0.003,
            debugChunks: false,

            poi: {
                spawnChance: 0.12,        // chance per chunk
                minDistance: 3            // chunks between POIs
            },

            biomeSettings: {
                forest: {
                    propDensity: 0.8,     // normalized (0–1)
                    mobDensity: 0.6,
                    poiWeight: 1.0
                },
                desert: {
                    propDensity: 0.4,
                    mobDensity: 0.3,
                    poiWeight: 0.7
                },
                ice: {
                    propDensity: 0.6,
                    mobDensity: 0.5,
                    poiWeight: 0.8
                },
                lava: {
                    propDensity: 0.3,
                    mobDensity: 0.8,
                    poiWeight: 1.2
                }
            }
        };

        // Store texture for each biome
        this.biomeTextures = new Map();
        this.propTextures = new Map(); // Cache prop textures globally
        this.spawnedPOIs = new Map();

        this.currentChunkInfo = null;
        this.onChunkChangeCallback = null;

        // Create PropManager
        this.propManager = new PropManager(world, colliders, this.worldSeed);

        // Create ground layer and prop layer
        this.groundLayer = new Container();
        this.debugLayer = new Container();
        this.entityLayer = new Container();
        this.propLayer = new Container();

        // Set prop layer for PropManager
        this.propManager.setPropLayer(this.propLayer);

        this.world.addChild(this.groundLayer);
        this.world.addChild(this.debugLayer); // Add after propLayer
        this.world.addChild(this.entityLayer);
        this.world.addChild(this.propLayer);

    }

    setEntitiesList(entities) {
        console.log("OpenWorld: setEntitiesList called");
        this.entitiesList = entities;

        if (!this.initialized) {
            this.initialized = true;
            this.update(0, 0);
        }
    }

    getChunkInfo(chunkX, chunkZ, playerX, playerZ) {
        const biome = this.getBiomeAtChunk(chunkX, chunkZ);

        const key = `${chunkX},${chunkZ}`;

        const mobs = this.spawnedEntities.get(key)?.mobs || [];
        const props = this.propManager.spawnedProps.get(key) || [];

        // simple POI example (extend later)
        let poi = null;
        if (biome === 'forest' && props.length > 8) poi = 'Ancient Grove';
        if (biome === 'lava' && mobs.length > 5) poi = 'Volcanic Nest';

        return {
            biome,
            chunkX,
            chunkZ,
            mobCount: mobs.length,
            propCount: props.length,
            poi
        };
    }

    spawnPOIInChunk(chunkX, chunkZ, biome) {
        const key = `${chunkX},${chunkZ}`;

        if (this.spawnedPOIs.has(key)) return;

        const seed = this.worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
        const rand = this.seededRandom(seed + 999);

        const biomeConfig = this.config.biomeSettings[biome];
        const chance = this.config.poi.spawnChance * (biomeConfig?.poiWeight || 1);

        if (rand > chance) return;

        // prevent clustering
        for (let dx = -this.config.poi.minDistance; dx <= this.config.poi.minDistance; dx++) {
            for (let dz = -this.config.poi.minDistance; dz <= this.config.poi.minDistance; dz++) {
                const nearbyKey = `${chunkX + dx},${chunkZ + dz}`;
                if (this.spawnedPOIs.has(nearbyKey)) return;
            }
        }

        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const x = chunkX * chunkSizeWorld + chunkSizeWorld / 2;
        const z = chunkZ * chunkSizeWorld + chunkSizeWorld / 2;

        // pick type
        const typeRand = this.seededRandom(seed + 5000);

        let type = 'event';
        if (typeRand > 0.7) type = 'boss';
        else if (typeRand > 0.4) type = 'loot';

        console.log(`POI spawned: ${type} at ${chunkX},${chunkZ}`);

        // DEBUG VISUAL
        const g = new Graphics();
        g.circle(0, 0, 80).fill({color: type === 'boss' ? 0xff0000 : 0x00ff00});
        g.x = x;
        g.y = z;
        this.world.addChild(g);

        this.spawnedPOIs.set(key, {
            type,
            x,
            z,
            biome
        });
    }

    // Deterministic random function based on seed
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    getBiomeAt(x, z) {
        const scale = this.config.biomeScale;
        const seed = this.worldSeed;

        const value =
            Math.sin((x + seed) * scale) *
            Math.cos((z - seed) * scale);

        if (value > 0.5) return 'forest';
        if (value < -0.5) return 'desert';

        const iceCheck =
            Math.sin((x + seed * 2) * scale * 1.5) *
            Math.cos((z - seed * 2) * scale * 1.5);

        if (iceCheck > 0.6) return 'ice';

        const lavaCheck =
            Math.sin((x - seed * 3) * scale * 0.7) *
            Math.cos((z + seed * 3) * scale * 0.7);

        if (lavaCheck < -0.6) return 'lava';

        return 'forest';
    }

    async getBiomeTexture(biome) {
        if (this.biomeTextures.has(biome)) {
            return this.biomeTextures.get(biome);
        }

        const biomeData = BIOME_COLORS[biome];
        if (biomeData?.texture) {
            try {
                const texture = await Assets.load(biomeData.texture);
                this.biomeTextures.set(biome, texture);
                return texture;
            } catch (err) {
                console.warn(`Failed to load texture for ${biome}:`, err);
                return null;
            }
        }
        return null;
    }

    getBiomeColor(biome) {
        const biomeData = BIOME_COLORS[biome];
        return biomeData?.base || 0x333333;
    }

    // In OpenWorldManager.js, add this method:
    getBiomeAtWorldPosition(worldX, worldZ) {
        // Convert world → tile space (same as your system)
        const x = worldX / this.tileSize;
        const z = worldZ / this.tileSize;

        const scale = this.config.biomeScale;
        const seed = this.worldSeed;

        const value =
            Math.sin((x + seed) * scale) *
            Math.cos((z - seed) * scale);

        if (value > 0.5) return 'forest';
        if (value < -0.5) return 'desert';

        const iceCheck =
            Math.sin((x + seed * 2) * scale * 1.5) *
            Math.cos((z - seed * 2) * scale * 1.5);

        if (iceCheck > 0.6) return 'ice';

        const lavaCheck =
            Math.sin((x - seed * 3) * scale * 0.7) *
            Math.cos((z + seed * 3) * scale * 0.7);

        if (lavaCheck < -0.6) return 'lava';

        return 'lava';
    }

// Instead of creating individual sprites per tile, create one TilingSprite per chunk
    async generateChunk(chunkX, chunkZ) {
        const chunkContainer = new Container();
        const startX = chunkX * this.chunkSize * this.tileSize;
        const startZ = chunkZ * this.chunkSize * this.tileSize;
        const chunkWidth = this.chunkSize * this.tileSize;
        const chunkHeight = this.chunkSize * this.tileSize;

        // Sample biome at center of chunk
        const centerX = (chunkX + 0.5) * this.chunkSize;
        const centerZ = (chunkZ + 0.5) * this.chunkSize;
        const biome = this.getBiomeAt(centerX, centerZ);
        const texture = await this.getBiomeTexture(biome);

        if (texture) {
            // Create a single tiling sprite for the entire chunk
            const tilingSprite = new TilingSprite(texture, chunkWidth, chunkHeight);
            tilingSprite.x = startX;
            tilingSprite.y = startZ;
            chunkContainer.addChild(tilingSprite);
        } else {
            // Fallback to colored rectangle
            const color = this.getBiomeColor(biome);
            const rect = new Graphics();
            rect.rect(0, 0, chunkWidth, chunkHeight).fill({color});
            rect.x = startX;
            rect.y = startZ;
            chunkContainer.addChild(rect);
        }

        // Draw line around chunk
        // Draw line around chunk
        if (this.config.debugChunks) {
            const border = new Graphics();
            const biomeData = BIOME_COLORS[biome];
            border
                .rect(0, 0, chunkWidth, chunkHeight)
                .stroke({width: 59, color: biomeData.base, alpha: 0.1});

            border.x = startX;
            border.y = startZ;

            const blurFilter = new BlurFilter();
            blurFilter.blur = 25;
            border.filters = [blurFilter];

            border.blendMode = 'screen';

            // Add to debug layer instead of chunk container
            this.debugLayer.addChild(border);

            // Store reference to remove later
            if (!this.debugBorders) this.debugBorders = new Map();
            this.debugBorders.set(`${chunkX},${chunkZ}`, border);
        }

        return chunkContainer;
    }

    // Create a collision circle for a prop
    createPropCollider(propX, propZ, propRadius = 20) {
        return {
            x: propX,
            y: propZ,
            r: propRadius,
            type: 'prop'
        };
    }

    // Preload all prop textures for a biome
    async preloadPropTextures(biome) {
        if (this.propTextures.has(biome)) return this.propTextures.get(biome);

        const biomeData = BIOME_COLORS[biome];
        const propsList = biomeData?.props || [];
        const textures = new Map();

        for (const propPath of propsList) {
            try {
                const texture = await Assets.load(propPath);
                textures.set(propPath, texture);
            } catch (err) {
                console.warn(`Failed to load prop: ${propPath}`);
            }
        }

        this.propTextures.set(biome, textures);
        return textures;
    }

    getBiomeAtChunk(chunkX, chunkZ) {
        const centerX = (chunkX + 0.5) * this.chunkSize;
        const centerZ = (chunkZ + 0.5) * this.chunkSize;
        return this.getBiomeAt(centerX, centerZ);
    }

    async loadChunk(chunkX, chunkZ, playerX, playerZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.loadedChunks.has(key)) return;

        const chunk = await this.generateChunk(chunkX, chunkZ);
        this.groundLayer.addChild(chunk);
        this.loadedChunks.set(key, chunk);

        const biome = this.getBiomeAtChunk(chunkX, chunkZ);

        this.spawnPOIInChunk(chunkX, chunkZ, biome);

        // Spawn props using PropManager
        await this.propManager.spawnPropsInChunk(chunkX, chunkZ, biome, this.chunkSize, this.tileSize);

        // Spawn mobs
        await this.spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, biome);
    }

    async spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, biome) {
        const key = `${chunkX},${chunkZ}`;

        // Check if we already have mobs for this chunk
        if (this.spawnedEntities.has(key)) {
            // Mobs already exist, just make them visible again
            const entities = this.spawnedEntities.get(key);
            for (const mob of entities.mobs) {
                mob.c.visible = true;
                // Also ensure they're in the global mobs list
                if (!this.entitiesList.mobs.includes(mob)) {
                    this.entitiesList.mobs.push(mob);
                }
            }
            return;
        }

        if (!this.entitiesList || !this.entitiesList.mobs) return;

        const entities = {mobs: []};
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        const seed = this.worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
        // Generate mob count based on biome and chunk position (deterministic)
        const mobCount = this.getMobCountForBiome(biome, seed);

        for (let i = 0; i < mobCount; i++) {
            const mobSeed = seed + i * 1000;

            // Try to find valid spawn position
            let x, z;
            let foundPosition = false;

            for (let attempt = 0; attempt < 20; attempt++) {
                const testX = startX + this.seededRandom(mobSeed + attempt * 10) * chunkSizeWorld;
                const testZ = startZ + this.seededRandom(mobSeed + attempt * 20) * chunkSizeWorld;

                // Don't spawn too close to player spawn
                if (Math.hypot(testX - playerX, testZ - playerZ) < 200) continue;
                if (!this.isInsideWorld(testX, testZ)) continue;

                // Check collision with props
                let collidesWithProp = false;
                const props = this.propManager.spawnedProps.get(key);
                if (props) {
                    for (const prop of props) {
                        if (Math.hypot(testX - prop.x, testZ - prop.z) < prop.radius + MOB_RADIUS) {
                            collidesWithProp = true;
                            break;
                        }
                    }
                }

                if (!collidesWithProp) {
                    x = testX;
                    z = testZ;
                    foundPosition = true;
                    break;
                }
            }

            if (!foundPosition) {
                // Fallback position
                x = startX + chunkSizeWorld / 2;
                z = startZ + chunkSizeWorld / 2;
            }

            const mob = spawnMob(this.entityLayer, x, z, biome);
            if (mob) {
                mob.spawnChunk = key; // Store which chunk this mob belongs to
                entities.mobs.push(mob);
            }
        }

        this.spawnedEntities.set(key, entities);

        if (this.entitiesList && this.entitiesList.mobs) {
            for (const mob of entities.mobs) {
                if (!this.entitiesList.mobs.includes(mob)) {
                    this.entitiesList.mobs.push(mob);
                }
            }
        }
    }

    // Add helper method for mob count per biome
    getMobCountForBiome(biome, seed) {
        const biomeConfig = this.config.biomeSettings[biome];
        const density = biomeConfig?.mobDensity || 0.5;

        const maxMobs = 8;

        const base = Math.floor(density * maxMobs);
        const variation = Math.floor(this.seededRandom(seed + 9999) * 3) - 1;

        return Math.max(1, base + variation);
    }

    async update(playerX, playerZ) {
        if (!this.initialized) return;

        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const centerChunkX = Math.floor(playerX / chunkSizeWorld);
        const centerChunkZ = Math.floor(playerZ / chunkSizeWorld);

        const newInfo = this.getChunkInfo(centerChunkX, centerChunkZ, playerX, playerZ);

        // only update if chunk changed
        if (
            !this.currentChunkInfo ||
            this.currentChunkInfo.chunkX !== newInfo.chunkX ||
            this.currentChunkInfo.chunkZ !== newInfo.chunkZ
        ) {
            this.currentChunkInfo = newInfo;

            if (this.onChunkChangeCallback) {
                this.onChunkChangeCallback(newInfo);
            }
        }

        const chunksToLoad = new Set();

        for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
            for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                const chunkX = centerChunkX + dx;
                const chunkZ = centerChunkZ + dz;
                const key = `${chunkX},${chunkZ}`;
                chunksToLoad.add(key);

                if (!this.loadedChunks.has(key)) {
                    await this.loadChunk(chunkX, chunkZ, playerX, playerZ);
                }
            }
        }

        // Unload distant chunks
        for (const [key, chunk] of this.loadedChunks) {
            if (!chunksToLoad.has(key)) {
                this.groundLayer.removeChild(chunk);
                chunk.destroy({children: true});
                this.loadedChunks.delete(key);

                // Unload props using PropManager
                this.propManager.unloadChunkProps(key);

                // Remove mobs (existing code)
                const entities = this.spawnedEntities.get(key);
                if (entities && this.entitiesList) {
                    for (const mob of entities.mobs) {
                        const index = this.entitiesList.mobs.indexOf(mob);
                        if (index > -1) {
                            this.entityLayer.removeChild(mob.c);
                            mob.c.destroy();
                            this.entitiesList.mobs.splice(index, 1);
                        }
                    }
                }
                this.spawnedEntities.delete(key);
            }
        }
    }

    getCurrentBounds() {
        return {
            minX: this.worldBounds.minX,
            maxX: this.worldBounds.maxX,
            minY: this.worldBounds.minY,
            maxY: this.worldBounds.maxY
        };
    }

    isInsideWorld(x, y, r = 0) {
        return x - r >= this.worldBounds.minX &&
            x + r <= this.worldBounds.maxX &&
            y - r >= this.worldBounds.minY &&
            y + r <= this.worldBounds.maxY;
    }

    clampToWorld(x, y, r = 0) {
        return {
            x: Math.max(this.worldBounds.minX + r, Math.min(this.worldBounds.maxX - r, x)),
            y: Math.max(this.worldBounds.minY + r, Math.min(this.worldBounds.maxY - r, y))
        };
    }
}