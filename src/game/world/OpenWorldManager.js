// world/OpenWorldManager.js
import {Container, Graphics, Sprite, Assets, TilingSprite, BlurFilter} from 'pixi.js';
import {spawnMob} from '../controllers/createMobController.js';
import {MOB_RADIUS, BIOME_COLORS} from '../constants.js';
import {PropManager} from "./PropManager.js";
import {useGameStore} from "../../stores/gameStore.js";
import { InteractablePropManager } from './interactablePropManager.js';   // ADD

const weatherConfig = {
    forest: {type: '🌧️ Rain', intensity: 5, color: '#44aaff'},
    desert: {type: '🌪️ Sandstorm', intensity: 0.7, color: '#ffaa44'},
    ice: {type: '❄️ Snow', intensity: 0.6, color: '#88ccff'},
    lava: {type: '🔥 Embers', intensity: 0.8, color: '#ff4400'}
};


export class OpenWorldManager {
    constructor(world, colliders, renderer) {
        this.world = world;
        this.colliders = colliders;
        this.renderer = renderer;
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
        this.worldSeed = Math.floor(Math.random() * 1000000);
        this.config = {
            biomeScale: 0.006,
            debugChunks: false,
            poi: {
                spawnChance: 0.12,
                minDistance: 3
            },
            biomeSettings: {
                forest: {mobDensity: 0.05, poiWeight: 1.0},
                desert: {mobDensity: 0.5, poiWeight: 0.7},
                ice: {mobDensity: 1, poiWeight: 0.8},
                lava: {mobDensity: 2, poiWeight: 1.2}
            }
        };

        this.biomeTextures = new Map();
        this.spawnedPOIs = new Map();
        this.chunkData = new Map();

        this.lastChunkUpdate = 0;
        this.chunkUpdateInterval = 100; // Only update chunks every 100ms
        this.processingChunks = false;
        this.pendingChunks = new Set();
        this.persistedProps = new Set();
        this.persistedMobs = new Set();
        this.onChunkChangeCallback = null; // ADD THIS LINE

        // Create PropManager
        this.propManager = new PropManager(world, colliders, this.worldSeed);

        // Create layers
        this.groundLayer = new Container();
        this.shadowLayer = new Container();
        this.debugLayer = new Container();
        this.entityLayer = new Container();
        this.propLayer = new Container();

        this.groundLayer.label = 'groundLayer';
        this.entityLayer.label = 'entityLayer';
        this.propLayer.label = 'propLayer';
        this.shadowLayer.label = 'shadowLayer';
        this.debugLayer.label = 'debugLayer';

        this.propManager.setPropLayer(this.entityLayer);
        this.propManager.setShadowLayer(this.entityLayer);

        this.world.addChild(this.groundLayer);
        this.world.addChild(this.debugLayer);
        this.world.addChild(this.entityLayer);
        //this.world.addChild(this.shadowLayer);
        //this.world.addChild(this.propLayer);


        this.entityLayer.sortableChildren = true;

        // NOW construct interactablePropManager  ← moved down here
        this.interactablePropManager = new InteractablePropManager(
            this,
            colliders,
            this.worldSeed,
            (loot, propDef, x, y) => {
                if (this.onLootCallback) this.onLootCallback(loot, propDef, x, y);
            }
        );
        this.interactablePropManager.setLayer(this.entityLayer); // ← entityLayer exists now ✓
        this.onLootCallback = null;

        this.chunkTypes = {
            empty: 0.25,
            mob_pack: 0.45,
            dense_pack: 0.15,
            poi: 0.10,
            elite: 0.04,
            boss: 0.01
        };

        // For debug
        this._debugTimer = 0;
        this._debugInterval = 5000; // 5 seconds
    }

    generateChunkData(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;

        if (this.chunkData.has(key)) {
            return this.chunkData.get(key);
        }

        const biome = this.getBiomeAtChunk(chunkX, chunkZ);
        const weather = weatherConfig[biome];

        const seed =
            this.worldSeed ^
            (chunkX * 73856093) ^
            (chunkZ * 19349663);

        const rand = this.seededRandom(seed);

        let cumulative = 0;
        let type = 'empty';

        for (const [k, weight] of Object.entries(this.chunkTypes)) {
            cumulative += weight;

            if (rand <= cumulative) {
                type = k;
                break;
            }
        }

        const chunkLevel = Math.floor(Math.sqrt(chunkX * chunkX + chunkZ * chunkZ));
        const difficulty = Math.pow(1.08, chunkLevel);

        const data = {
            biome,
            type,
            seed,
            weather,
            difficulty,
            packs: [],
            poi: null,
        };

        // Generate encounters
        if (type === 'mob_pack') {
            data.packs = this.generateMobPacks(chunkX, chunkZ, 1, seed, difficulty);
        }

        if (type === 'dense_pack') {
            data.packs = this.generateMobPacks(chunkX, chunkZ, 3, seed, difficulty);
        }

        if (type === 'elite') {
            //data.packs = this.generateElitePack(chunkX, chunkZ, seed);
        }

        if (type === 'poi') {
            //data.poi = this.generatePOI(chunkX, chunkZ, biome, seed);
        }

        this.chunkData.set(key, data);

        return data;
    }

    generateMobPacks(chunkX, chunkZ, packCount, seed, difficulty) {
        const packs = [];

        const defaultPackSize = difficulty;
        const chunkSizeWorld = this.chunkSize * this.tileSize;

        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;

        for (let i = 0; i < packCount; i++) {

            const packSeed = seed + i * 9999;

            const centerX =
                startX +
                this.seededRandom(packSeed) * chunkSizeWorld;

            const centerZ =
                startZ +
                this.seededRandom(packSeed + 5555) * chunkSizeWorld;

            packs.push({
                x: centerX,
                z: centerZ,
                radius: 120 + this.seededRandom(packSeed + 888) * 120,
                mobCount: defaultPackSize + Math.floor(this.seededRandom(packSeed + 999) * 5),
                archetype: 'melee'
            });
        }

        return packs;
    }

    setEntitiesList(entities) {
        this.entitiesList = entities;
        if (!this.initialized) {
            this.initialized = true;
            this.update(0, 0);
        }
    }

    spawnPOIInChunk(chunkX, chunkZ, biome) {
        const key = `${chunkX},${chunkZ}`;
        if (this.spawnedPOIs.has(key)) return;
        const seed = this.worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
        const rand = this.seededRandom(seed + 999);
        const biomeConfig = this.config.biomeSettings[biome];
        const chance = this.config.poi.spawnChance * (biomeConfig?.poiWeight || 1);
        if (rand > chance) return;
        for (let dx = -this.config.poi.minDistance; dx <= this.config.poi.minDistance; dx++) {
            for (let dz = -this.config.poi.minDistance; dz <= this.config.poi.minDistance; dz++) {
                if (this.spawnedPOIs.has(`${chunkX + dx},${chunkZ + dz}`)) return;
            }
        }
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const x = chunkX * chunkSizeWorld + chunkSizeWorld / 2;
        const z = chunkZ * chunkSizeWorld + chunkSizeWorld / 2;
        const typeRand = this.seededRandom(seed + 5000);
        let type = 'event';
        if (typeRand > 0.7) type = 'boss';
        else if (typeRand > 0.4) type = 'loot';
        const g = new Graphics();
        g.circle(0, 0, 80).fill({color: type === 'boss' ? 0xff0000 : 0x00ff00});
        g.x = x;
        g.y = z;
        this.world.addChild(g);
        this.spawnedPOIs.set(key, {type, x, z, biome});
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    getBiomeAt(x, z) {
        const scale = this.config.biomeScale;
        const seed = this.worldSeed;
        const value = Math.sin((x + seed) * scale) * Math.cos((z - seed) * scale);
        if (value > 0.5) return 'forest';
        if (value < -0.5) return 'desert';
        const iceCheck = Math.sin((x + seed * 2) * scale * 1.5) * Math.cos((z - seed * 2) * scale * 1.5);
        if (iceCheck > 0.6) return 'ice';
        const lavaCheck = Math.sin((x - seed * 3) * scale * 0.7) * Math.cos((z + seed * 3) * scale * 0.7);
        if (lavaCheck < -0.6) return 'lava';
        return 'forest';
    }

    async getBiomeTexture(biome) {
        if (this.biomeTextures.has(biome)) return this.biomeTextures.get(biome);
        const biomeData = BIOME_COLORS[biome];
        if (biomeData?.texture) {
            try {
                const texture = await Assets.load(biomeData.texture);
                this.biomeTextures.set(biome, texture);
                return texture;
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    getBiomeColor(biome) {
        const biomeData = BIOME_COLORS[biome];
        return biomeData?.base || 0x333333;
    }

    async generateChunk(chunkX, chunkZ) {
        const chunkContainer = new Container();
        const startX = chunkX * this.chunkSize * this.tileSize;
        const startZ = chunkZ * this.chunkSize * this.tileSize;
        const chunkWidth = this.chunkSize * this.tileSize;
        const chunkHeight = this.chunkSize * this.tileSize;
        const centerX = (chunkX + 0.5) * this.chunkSize;
        const centerZ = (chunkZ + 0.5) * this.chunkSize;
        const biome = this.getBiomeAt(centerX, centerZ);
        const texture = await this.getBiomeTexture(biome);
        if (texture) {
            const tilingSprite = new TilingSprite(texture, chunkWidth, chunkHeight);
            tilingSprite.x = startX;
            tilingSprite.y = startZ;
            chunkContainer.addChild(tilingSprite);
        } else {
            const color = this.getBiomeColor(biome);
            const rect = new Graphics();
            rect.rect(0, 0, chunkWidth, chunkHeight).fill({color});
            rect.x = startX;
            rect.y = startZ;
            chunkContainer.addChild(rect);
        }

        return chunkContainer;
    }

    getBiomeAtChunk(chunkX, chunkZ) {
        const centerX = (chunkX + 0.5) * this.chunkSize;
        const centerZ = (chunkZ + 0.5) * this.chunkSize;
        return this.getBiomeAt(centerX, centerZ);
    }

    async spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, chunkData) {
        const key = `${chunkX},${chunkZ}`;
        const chunkLevel = Math.floor(Math.sqrt(chunkX * chunkX + chunkZ * chunkZ));
        const difficulty = Math.pow(1.08, chunkLevel);

        if (this.spawnedEntities.has(key)) return;

        const entities = { mobs: [] };

        for (const pack of chunkData.packs) {

            for (let i = 0; i < pack.mobCount; i++) {

                const angle = Math.random() * Math.PI * 2;

                const dist = Math.random() * pack.radius;

                const x = pack.x + Math.cos(angle) * dist;
                const z = pack.z + Math.sin(angle) * dist;

                // TODO: Dont respawn mobs that are killed
                //if (this.persistedMobs.has(mobId)) continue;

                const mob = spawnMob(
                    this.renderer,
                    this.entityLayer,
                    x,
                    z,
                    chunkData.biome,
                    '',
                    difficulty
                );

                if (mob) {
                    mob.spawnChunk = key;
                    mob.packId = `${key}_${pack.x}_${pack.z}`;

                    entities.mobs.push(mob);

                    this.entitiesList.mobs.push(mob);
                }
            }
        }

        this.spawnedEntities.set(key, entities);
    }

    async update(playerX, playerZ, dt) {
        if (!this.initialized) return;

        const now = Date.now();
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const centerChunkX = Math.floor(playerX / chunkSizeWorld);
        const centerChunkZ = Math.floor(playerZ / chunkSizeWorld);

        // 🔥 CHECK FOR CHUNK CHANGE 🔥
        if (centerChunkX !== this.lastPlayerChunk.x || centerChunkZ !== this.lastPlayerChunk.z) {
            // Get the new biome
            const newBiome = this.getBiomeAtChunk(centerChunkX, centerChunkZ);
            const oldBiome = this.lastPlayerChunk.biome;

            // Get chunk key for accessing data
            const chunkKey = `${centerChunkX},${centerChunkZ}`;

            // Get mob count in new chunk
            const entitiesInChunk = this.spawnedEntities.get(chunkKey);
            const mobCount = entitiesInChunk?.mobs?.length || 0;

            // ✅ FIXED: Get prop count in new chunk
            const propsInChunk = this.colliders.filter(c => c.chunkKey === chunkKey && c.type === 'prop');
            const propCount = propsInChunk.length;

            // Get weather info based on biome
            const weather = weatherConfig[newBiome] || {type: '☀️ Clear', intensity: 0, color: '#ffffff'};

            this.debugCountScene();

            // 🔥 TRIGGER THE CALLBACK HERE 🔥
            if (this.onChunkChangeCallback) {
                this.onChunkChangeCallback({
                    chunkX: centerChunkX,
                    chunkZ: centerChunkZ,
                    biome: newBiome,
                    x: centerChunkX * chunkSizeWorld,
                    z: centerChunkZ * chunkSizeWorld,
                    oldChunkX: this.lastPlayerChunk.x,
                    oldChunkZ: this.lastPlayerChunk.z,
                    oldBiome: this.lastPlayerChunk.biome,
                    mobCount: mobCount,
                    propCount: propCount,
                    weather: weather
                });
            }

            // Update last player chunk
            this.lastPlayerChunk = {
                x: centerChunkX,
                z: centerChunkZ,
                biome: newBiome
            };
        }
        // Calculate active chunks
        const activeChunks = new Set();
        for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
            for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                activeChunks.add(`${centerChunkX + dx},${centerChunkZ + dz}`);
            }
        }

        // THROTTLE: Only process chunk loading/unloading every 100ms
        if (now - this.lastChunkUpdate >= this.chunkUpdateInterval) {
            this.lastChunkUpdate = now;

            // Queue chunks to load
            for (const key of activeChunks) {
                if (!this.loadedChunks.has(key) && !this.pendingChunks.has(key)) {
                    this.pendingChunks.add(key);
                }
            }

            // Process pending chunks in batches
            if (!this.processingChunks && this.pendingChunks.size > 0) {
                this.processingChunks = true;
                const toProcess = Array.from(this.pendingChunks).slice(0, 3);
                for (const key of toProcess) {
                    this.pendingChunks.delete(key);
                    const [chunkX, chunkZ] = key.split(',').map(Number);
                    await this.loadChunk(chunkX, chunkZ, playerX, playerZ);
                }
                this.processingChunks = false;
            }

            // Unload far chunks
            for (const [key, chunk] of this.loadedChunks) {
                if (!activeChunks.has(key)) {
                    await this.unloadChunk(key);
                }
            }
        }

        // Only update mobs (no chunk loading this frame)
        for (const m of this.entitiesList.mobs) {
            const mobChunkX = Math.floor(m.x / chunkSizeWorld);
            const mobChunkZ = Math.floor(m.y / chunkSizeWorld);
            if (activeChunks.has(`${mobChunkX},${mobChunkZ}`)) {
                m.controller.update({
                    px: playerX, py: playerZ,
                    colliders: this.colliders,
                    openWorld: this,
                    enemyProjs: this.entitiesList.enemyProjs,
                    playerState: useGameStore.getState().player,
                    mobs: this.entitiesList.mobs,
                    world: this.world,
                    dt: dt
                });
            }
        }

        // Interactable props
        this.interactablePropManager.update(playerX, playerZ, dt ?? 0);
    }

    async unloadChunk(key) {
        const chunk = this.loadedChunks.get(key);
        if (!chunk) return;

        // FIX: Destroy the chunk directly (it IS the ground)
        if (chunk.parent) {
            this.groundLayer.removeChild(chunk);
        }
        chunk.destroy({children: true});

        // Unload props (this is handled correctly)
        this.propManager.unloadChunkProps(key);

        // Unload interactable props
        this.interactablePropManager.unloadChunkProps(key);

        // Remove mobs
        const entities = this.spawnedEntities.get(key);
        if (entities) {
            for (const mob of entities.mobs) {
                // Remove from global active list
                const index = this.entitiesList?.mobs?.indexOf(mob);
                if (index > -1) {
                    this.entitiesList.mobs.splice(index, 1);
                }
                // Remove from world
                if (mob.c && mob.c.parent) {
                    this.entityLayer.removeChild(mob.c);
                }
                // Destroy mob
                if (mob.c) {
                    mob.c.destroy({children: true});
                }
                // Kill controller reference
                mob.controller = null;
            }
        }

        this.spawnedEntities.delete(key);
        this.loadedChunks.delete(key);

        // Also remove from active chunks tracking if exists
        if (this.propManager?.activeChunks) {
            this.propManager.activeChunks.delete(key);
        }
    }


    debugCountScene(openWorld) {
        let stats = {
            containers: 0,
            sprites: 0,
            graphics: 0,
            text: 0,
            other: 0,
            totalNodes: 0,
            maxDepth: 0
        };

        const roots = [
            this.entityLayer,
            this.propLayer,
            this.shadowLayer,
            this.groundLayer,
        ];

        const visited = new Set(); // prevents double counting

        const walk = (obj, depth = 0) => {
            if (!obj || visited.has(obj)) return;
            visited.add(obj);

            stats.totalNodes++;
            stats.maxDepth = Math.max(stats.maxDepth, depth);

            const name = obj.constructor.name;

            if (name === 'Container') stats.containers++;
            else if (name === 'Sprite') stats.sprites++;
            else if (name === 'Graphics') stats.graphics++;
            else if (name === 'Text') stats.text++;
            else stats.other++;

            if (obj.children && obj.children.length) {
                for (const child of obj.children) {
                    walk(child, depth + 1);
                }
            }
        };

        for (const root of roots) {
            walk(root);
        }

        console.log("=== FULL SCENE (ALL ROOTS) ===");
        console.table(stats);
    }

    async loadChunk(chunkX, chunkZ, playerX, playerZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.loadedChunks.has(key)) return;

        const chunk = await this.generateChunk(chunkX, chunkZ);
        // Store biome with chunk for cleanup
        chunk.biome = this.getBiomeAtChunk(chunkX, chunkZ);
        chunk.chunkX = chunkX;
        chunk.chunkZ = chunkZ;

        // Chunk ground
        this.groundLayer.addChild(chunk);

        // Chunk props
        await this.propManager.generateChunkProps(chunkX, chunkZ, chunk.biome, this.chunkSize, this.tileSize);

        // Chunk interactable props
        await this.interactablePropManager.generateChunkProps(
            chunkX, chunkZ, chunk.biome, this.chunkSize, this.tileSize
        );

        // Chunk mobs
        const chunkData = this.generateChunkData(chunkX, chunkZ);

        chunk.chunkData = chunkData;

        await this.spawnMobsInChunk(
            chunkX,
            chunkZ,
            playerX,
            playerZ,
            chunkData
        );

        this.loadedChunks.set(key, chunk);
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
        return x - r >= this.worldBounds.minX && x + r <= this.worldBounds.maxX &&
            y - r >= this.worldBounds.minY && y + r <= this.worldBounds.maxY;
    }

    clampToWorld(x, y, r = 0) {
        return {
            x: Math.max(this.worldBounds.minX + r, Math.min(this.worldBounds.maxX - r, x)),
            y: Math.max(this.worldBounds.minY + r, Math.min(this.worldBounds.maxY - r, y))
        };
    }
}