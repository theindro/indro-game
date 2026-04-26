// world/OpenWorldManager.js
import {Container, Graphics, Sprite, Assets, TilingSprite, BlurFilter} from 'pixi.js';
import {spawnMob} from '../controllers/createMobController.js';
import {MOB_RADIUS, BIOME_COLORS} from '../constants.js';
import {PropManager} from "../props.js";
import {useGameStore} from "../../stores/gameStore.js";

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
        this.worldSeed = 5021;

        this.config = {
            biomeScale: 0.006,
            debugChunks: false,
            poi: {
                spawnChance: 0.12,
                minDistance: 3
            },
            biomeSettings: {
                forest: { propDensity: 0.8, mobDensity: 0.5, poiWeight: 1.0 },
                desert: { propDensity: 0.4, mobDensity: 0.3, poiWeight: 0.7 },
                ice: { propDensity: 0.6, mobDensity: 0.5, poiWeight: 0.8 },
                lava: { propDensity: 0.3, mobDensity: 0.8, poiWeight: 1.2 }
            }
        };

        this.biomeTextures = new Map();
        this.spawnedPOIs = new Map();

        this.lastChunkUpdate = 0;
        this.chunkUpdateInterval = 100; // Only update chunks every 100ms
        this.processingChunks = false;
        this.pendingChunks = new Set();
        this.onChunkChangeCallback = null; // ADD THIS LINE

        // Create PropManager
        this.propManager = new PropManager(world, colliders, this.worldSeed);

        // Create layers
        this.groundLayer = new Container();
        this.shadowLayer = new Container();
        this.debugLayer = new Container();
        this.entityLayer = new Container();
        this.propLayer = new Container();

        this.propManager.setPropLayer(this.propLayer);
        this.propManager.setShadowLayer(this.shadowLayer);

        this.world.addChild(this.groundLayer);
        this.world.addChild(this.debugLayer);
        this.world.addChild(this.entityLayer);
        this.world.addChild(this.shadowLayer);
        this.world.addChild(this.propLayer);

        // For debug
        this.lastDebugTime = 0;
        this.debugInterval = 5000;

    }

    setEntitiesList(entities) {
        console.log("OpenWorld: setEntitiesList called");
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
        this.spawnedPOIs.set(key, { type, x, z, biome });
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

    getBiomeAtWorldPosition(worldX, worldZ) {
        const x = worldX / this.tileSize;
        const z = worldZ / this.tileSize;
        const scale = this.config.biomeScale;
        const seed = this.worldSeed;
        const value = Math.sin((x + seed) * scale) * Math.cos((z - seed) * scale);
        if (value > 0.5) return 'forest';
        if (value < -0.5) return 'desert';
        const iceCheck = Math.sin((x + seed * 2) * scale * 1.5) * Math.cos((z - seed * 2) * scale * 1.5);
        if (iceCheck > 0.6) return 'ice';
        const lavaCheck = Math.sin((x - seed * 3) * scale * 0.7) * Math.cos((z + seed * 3) * scale * 0.7);
        if (lavaCheck < -0.6) return 'lava';
        return 'lava';
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

    async spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, biome) {
        const key = `${chunkX},${chunkZ}`;

        if (this.spawnedEntities.has(key)) {
            const entities = this.spawnedEntities.get(key);
            for (const mob of entities.mobs) {
                mob.c.visible = true;
                if (!this.entitiesList.mobs.includes(mob)) {
                    this.entitiesList.mobs.push(mob);
                }
            }
            return;
        }

        if (!this.entitiesList?.mobs) return;
        const entities = {mobs: []};
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;
        const seed = this.worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
        const mobCount = this.getMobCountForBiome(biome, seed);

        // Get all colliders in this chunk
        const props = this.propManager?.chunkColliders?.get(key) || [];

        for (let i = 0; i < mobCount; i++) {
            // Use a different seed for EACH mob and EACH attempt
            let x, z, foundPosition = false;

            // Generate random position with better distribution
            for (let attempt = 0; attempt < 30; attempt++) {
                // Create unique seed for each attempt
                const attemptSeed = seed + (i * 10000) + (attempt * 37);

                // Generate random position within chunk bounds (not just center)
                const randomX = this.seededRandom(attemptSeed);
                const randomZ = this.seededRandom(attemptSeed + 12345);

                // Spread mobs across the entire chunk, not clustered in center
                const testX = startX + randomX * chunkSizeWorld;
                const testZ = startZ + randomZ * chunkSizeWorld;

                // Check distance from player (avoid spawning too close)
                if (Math.hypot(testX - playerX, testZ - playerZ) < 200) continue;

                // Check world bounds
                if (!this.isInsideWorld(testX, testZ)) continue;

                // Check collision with props
                let collidesWithProp = false;

                for (const p of props) {
                    if (p.width && p.height) {
                        const halfW = p.width * 0.5;
                        const halfH = p.height * 0.5;
                        const left = p.x - halfW;
                        const right = p.x + halfW;
                        const top = p.y - halfH;
                        const bottom = p.y + halfH;

                        const closestX = Math.max(left, Math.min(testX, right));
                        const closestY = Math.max(top, Math.min(testZ, bottom));
                        const dx = testX - closestX;
                        const dy = testZ - closestY;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < MOB_RADIUS * MOB_RADIUS * 4) { // Add margin
                            collidesWithProp = true;
                            break;
                        }
                    }
                    else if (p.r) {
                        const dx = testX - p.x;
                        const dy = testZ - p.y;
                        const dist = Math.hypot(dx, dy);

                        if (dist < (p.r || 40) + MOB_RADIUS * 2) { // Add margin
                            collidesWithProp = true;
                            break;
                        }
                    }
                }

                // Also check distance from other mobs in same spawn batch
                if (!collidesWithProp && entities.mobs.length > 0) {
                    for (const existingMob of entities.mobs) {
                        const distToExisting = Math.hypot(testX - existingMob.x, testZ - existingMob.z);
                        if (distToExisting < MOB_RADIUS * 3) { // Keep mobs spread out
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
                // Last resort: place at random edge of chunk
                const fallbackSeed = seed + i * 999999;
                x = startX + this.seededRandom(fallbackSeed) * chunkSizeWorld;
                z = startZ + this.seededRandom(fallbackSeed + 777777) * chunkSizeWorld;

                // Clamp to world bounds
                x = Math.max(50, Math.min(x, this.worldWidth - 50));
                z = Math.max(50, Math.min(z, this.worldHeight - 50));
            }

            const mob = spawnMob(this.entityLayer, x, z, biome);
            if (mob) {
                mob.spawnChunk = key;
                entities.mobs.push(mob);
            }
        }

        this.spawnedEntities.set(key, entities);
        for (const mob of entities.mobs) {
            if (!this.entitiesList.mobs.includes(mob)) this.entitiesList.mobs.push(mob);
        }
    }

    getMobCountForBiome(biome, seed) {
        const biomeConfig = this.config.biomeSettings[biome];
        const density = biomeConfig?.mobDensity || 0.5;
        const maxMobs = 15 // Reduced from 8
        const base = Math.floor(density * maxMobs);
        const variation = Math.floor(this.seededRandom(seed + 9999) * 2) - 0;

        return Math.max(1, Math.min(25, base + variation));
    }

    async update(playerX, playerZ) {
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

            // Get prop count in new chunk
            const propsInChunk = this.propManager?.chunkColliders?.get(chunkKey) || [];
            const propCount = propsInChunk.length;

            // Get weather info based on biome
            const weatherConfig = {
                forest: { type: '🌧️ Rain', intensity: 5, color: '#44aaff' },
                desert: { type: '🌪️ Sandstorm', intensity: 0.7, color: '#ffaa44' },
                ice: { type: '❄️ Snow', intensity: 0.6, color: '#88ccff' },
                lava: { type: '🔥 Embers', intensity: 0.8, color: '#ff4400' }
            };
            const weather = weatherConfig[newBiome] || { type: '☀️ Clear', intensity: 0, color: '#ffffff' };

            // Optional: More compact single-line log
            console.log(`📊 [CHUNK ${centerChunkX},${centerChunkZ}] Biome: ${newBiome} | Mobs: ${mobCount} | Weather: ${weather.type}`);

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
                    shakeRef: { value: 0 },
                    mobs: this.entitiesList.mobs,
                    world: this.world
                });
            }
        }
    }

    async unloadChunk(key) {
        const chunk = this.loadedChunks.get(key);
        if (!chunk) return;

        // GROUND ONLY
        if (chunk.ground) {
            this.groundLayer.removeChild(chunk.ground);
            chunk.ground.destroy({ children: true });
        }

        // PROPS + SHADOWS HANDLED HERE ONLY
        this.propManager.unloadChunkProps(key);

        // 4. remove mobs and antities
        const entities = this.spawnedEntities.get(key);

        if (entities) {
            for (const mob of entities.mobs) {

                // 1. remove from global active list
                const index = this.entitiesList?.mobs?.indexOf(mob);
                if (index > -1) {
                    this.entitiesList.mobs.splice(index, 1);
                }

                // 2. destroy visual
                mob.c?.destroy?.();

                // 3. kill controller reference (IMPORTANT)
                mob.controller = null;
            }
        }

        this.spawnedEntities.delete(key);
        this.loadedChunks.delete(key);
    }

    debugCountScene() {
        let totalContainers = 0;
        let totalSprites = 0;
        let totalGraphics = 0;
        let totalChildren = 0;

        const walk = (obj) => {
            if (!obj) return;

            if (obj.children) {
                totalContainers++;
                totalChildren += obj.children.length;

                for (const child of obj.children) {
                    if (child instanceof Sprite) totalSprites++;
                    else if (child instanceof Graphics) totalGraphics++;

                    walk(child);
                }
            }
        };

        walk(this.world);

        console.log('=== SCENE DEBUG ===');
        console.log('Containers:', totalContainers);
        console.log('Sprites:', totalSprites);
        console.log('Graphics:', totalGraphics);
        console.log('Total children refs:', totalChildren);
    }

    async loadChunk(chunkX, chunkZ, playerX, playerZ) {
        const key = `${chunkX},${chunkZ}`;

        // If already loaded, just return
        if (this.loadedChunks.has(key)) {
            return;
        }


        const chunk = await this.generateChunk(chunkX, chunkZ);

        this.groundLayer.addChild(chunk);

        const biome = this.getBiomeAtChunk(chunkX, chunkZ);

        await this.propManager.generateChunkProps(chunkX, chunkZ, biome, this.chunkSize, this.tileSize);

        await this.spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, biome);

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