// world/OpenWorldManager.js
import {Container, Graphics, Sprite, Assets, TilingSprite, BlurFilter} from 'pixi.js';
import { BIOME_COLORS, MOB_RADIUS } from '../constants.js';
import {PropManager} from "./PropManager.js";
import {useGameStore} from "../../stores/gameStore.js";
import {InteractablePropManager} from './interactablePropManager.js';
import {WorldObjectManager} from './WorldObjectManager.js';

import { WorldEditorController } from '../devtools/WorldEditorController.js';
import { pickChunkProfile, computeLayoutAnchors } from './chunkProfile.js';
import { generateLakesForChunk, isPointInLake } from './lakes/lakeGen.js';
import {
    buildLakeRenderShape,
    getLakeShapeBounds,
    isCircleOverlappingLake,
} from './lakes/lakeGeometry.js';
import {
    clearLakeAnimatorsForChunk,
    renderLakesIntoChunk,
    tickLakeWaterAnimations,
} from './lakes/lakeRenderer.js';
import { sampleMobPackCenter } from './chunkPlacement.js';
import {editorBridge} from "../../components/devtools/editorBridge.js";
import { loadBossChunkContent } from './bossChunkContent.js';
import { getChunkDifficulty } from '../difficultyScaling.js';
import { getBiomeForChunk, getWorldContentScales } from './worldProgression.js';
import { TotemWaveEventManager } from './events/totemWaveEvent.js';
import {
    MAX_ACTIVE_MOBS,
    MAX_PACKS_PER_DENSE_CHUNK,
    computePackSizeScale,
    clampPackMobCount,
    capPackMobCounts,
    getMaxMobsPerChunk,
    getRemainingMobBudget,
    isMobSpawnTooClose,
    pickMobsToCull,
    shouldRenderMob,
    shouldSimulateMob,
} from './mobSpawnLimits.js';

const weatherConfig = {
    forest: { type: '🌲 Dynamic (day/sunset/night/rain)', color: '#5a9a6a' },
    desert: { type: '🏜️ Dynamic (heat/sandstorm)', color: '#ffaa44' },
    ice: { type: '❄️ Dynamic (snow/blizzard)', color: '#88ccff' },
    lava: { type: '🔥 Dynamic (smoke/embers)', color: '#ff4400' },
};

export class OpenWorldManager {
    /**
     * @param {import('pixi.js').Container} world
     * @param {unknown[]} colliders
     * @param {import('pixi.js').Application} app
     * @param {number} [worldSeedFromStore] Persisted run seed (layout deterministic per value).
     */
    constructor(world, colliders, app, worldSeedFromStore) {
        this.world = world;
        this.colliders = colliders;
        this.renderer = app.renderer;
        this.chunkSize = 32;
        this.tileSize = 64;
        this.renderDistance = 1;
        this.loadedChunks = new Map();
        this.spawnedEntities = new Map();
        /** Sentinel so the first `update` always runs chunk-change + weather (was 0,0 matching spawn chunk). */
        this.lastPlayerChunk = null;
        this.worldBounds = {
            minX: -200000,
            maxX: 200000,
            minY: -200000,
            maxY: 200000
        };
        this.worldMode = "procedural";// "procedural" | "editor" | "loaded"
        this.worldData = {
            chunks: new Map()
        };

        this.entitiesList = null;
        this.initialized = false;
        this.worldSeed =
            typeof worldSeedFromStore === 'number' && Number.isFinite(worldSeedFromStore)
                ? worldSeedFromStore | 0
                : 1337;
        this.config = {
            debugChunks: false,
            poi: {
                spawnChance: 0.12,
                minDistance: 3
            },
            biomeSettings: {
                forest: {mobDensity: 0.14, poiWeight: 1.0},
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
        this.persistedMobs = new Set();
        /** @type {Set<string>} */
        this._bossRewardChestKeys = new Set();
        this.onChunkChangeCallback = null; // ADD THIS LINE

        // World editor
        this.editorLayer = new Container();
        this.editorLayer.label = "editorLayer";
        this.editorLayer.zIndex = 99999;

        // IMPORTANT: do NOT parent it to world
        this.world.addChild(this.editorLayer);

        this.editorMode = false;
        this.selectedPropId = null;
        this.ghostSprite = null;
        this.world.sortableChildren = true;
        this.editor = new WorldEditorController(this, app);
        editorBridge.setController(this.editor);

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

        this.world.addChild(this.groundLayer);
        this.world.addChild(this.debugLayer);
        this.world.addChild(this.entityLayer);

        this.entityLayer.sortableChildren = true;

        this.worldObjects = new WorldObjectManager(colliders, this.entityLayer, this.renderer);

        this.propManager = new PropManager(this.worldObjects, this.worldSeed);
        this.propManager.setPropLayer(this.entityLayer);
        this.propManager.setShadowLayer(this.entityLayer);

        this.interactablePropManager = new InteractablePropManager(
            this.worldObjects,
            this.worldSeed
        );
        this.totemWaveEvent = new TotemWaveEventManager(this);
        this.interactablePropManager.onEventStart = (prop) =>
            this.totemWaveEvent.tryStart(prop);

        this.chunkTypes = {
            empty: 0.18,
            mob_pack: 0.5,
            dense_pack: 0.18,
            poi: 0.10,
            elite: 0.04,
            boss: 0.01
        };

        // Chunk debug
        this.chunkDebugGraphics = new Graphics();
        this.debugLayer.addChild(this.chunkDebugGraphics);

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

        const landscapeProfile = pickChunkProfile(biome, chunkX, chunkZ, this.worldSeed);
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const layoutAnchors = computeLayoutAnchors(
            landscapeProfile,
            chunkX,
            chunkZ,
            this.worldSeed,
            chunkSizeWorld
        );

        const lakes = generateLakesForChunk(
            chunkX,
            chunkZ,
            this.worldSeed,
            landscapeProfile,
            this.chunkSize,
            this.tileSize
        );

        const difficulty = getChunkDifficulty(chunkX, chunkZ);
        const contentScales = getWorldContentScales(difficulty);

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

        const mobBonus = (landscapeProfile.mobPackBonus ?? 0) * contentScales.mobPackChanceMul;
        if (!landscapeProfile.spawnBoss && mobBonus > 0 && type === 'empty' && this.seededRandom(seed + 55555) < mobBonus) {
            type = 'mob_pack';
        }

        if (landscapeProfile.spawnBoss) {
            type = 'boss_arena';
        }

        if (landscapeProfile.forceChunkType && !landscapeProfile.spawnBoss) {
            type = landscapeProfile.forceChunkType;
        }

        const data = {
            biome,
            type,
            seed,
            weather,
            difficulty,
            contentScales,
            packs: [],
            poi: null,
            landscapeProfile,
            layoutAnchors,
            lakes,
        };

        // Generate encounters
        const packMul = landscapeProfile.mobPackCountMul ?? 1;

        const packSizeScale = computePackSizeScale(difficulty, contentScales);
        const packCountScale = contentScales.mobPackCountMul;

        const chunkMobCap = getMaxMobsPerChunk(difficulty);

        if (type === 'mob_pack') {
            data.packs = capPackMobCounts(
                this.generateMobPacks(chunkX, chunkZ, 1, seed, packSizeScale, layoutAnchors, packMul * packCountScale, difficulty),
                chunkMobCap
            );
        }

        if (type === 'dense_pack') {
            const denseCount = Math.min(
                MAX_PACKS_PER_DENSE_CHUNK,
                Math.max(1, Math.round(2 * packMul * packCountScale))
            );
            data.packs = capPackMobCounts(
                this.generateMobPacks(chunkX, chunkZ, denseCount, seed, packSizeScale, layoutAnchors, packMul, difficulty),
                chunkMobCap
            );
        }

        if (type === 'elite') {
            //data.packs = this.generateElitePack(chunkX, chunkZ, seed);
        }

        if (type === 'poi') {
            const key = `${chunkX},${chunkZ}`;

            const poi = this.spawnedPOIs.get(key);

            if (poi) {
                data.poi = poi;
            }
        }

        this.chunkData.set(key, data);

        return data;
    }

    generateMobPacks(chunkX, chunkZ, packCount, seed, packSizeScale, layoutAnchors = null, packMul = 1, difficulty = 1) {
        const packs = [];

        const d = Math.max(1, difficulty ?? 1);
        const defaultPackSize = Math.max(2, Math.round(packSizeScale));
        const packMulClamped = Math.min(packMul, d <= 3 ? 1.15 : 2.35);
        const chunkSizeWorld = this.chunkSize * this.tileSize;

        const startX = chunkX * chunkSizeWorld;
        const startZ = chunkZ * chunkSizeWorld;
        const margin = chunkSizeWorld * 0.12;
        const usable = chunkSizeWorld - margin * 2;
        const gridCols = Math.max(1, Math.ceil(Math.sqrt(packCount)));

        for (let i = 0; i < packCount; i++) {

            const packSeed = seed + i * 9999;

            let centerX;
            let centerZ;

            if (layoutAnchors) {
                const center = sampleMobPackCenter(layoutAnchors, i, packSeed);
                centerX = center.x;
                centerZ = center.z;
            } else if (packCount > 1) {
                const col = i % gridCols;
                const row = Math.floor(i / gridCols);
                const gridRows = Math.ceil(packCount / gridCols);
                const cellW = usable / gridCols;
                const cellH = usable / gridRows;
                centerX = startX + margin + (col + 0.5) * cellW + (this.seededRandom(packSeed) - 0.5) * cellW * 0.38;
                centerZ = startZ + margin + (row + 0.5) * cellH + (this.seededRandom(packSeed + 5555) - 0.5) * cellH * 0.38;
            } else {
                centerX = startX + margin + this.seededRandom(packSeed) * usable;
                centerZ = startZ + margin + this.seededRandom(packSeed + 5555) * usable;
            }

            const spreadRadius = 200 + this.seededRandom(packSeed + 888) * (d <= 3 ? 140 : 240);

            packs.push({
                x: centerX,
                z: centerZ,
                radius: spreadRadius,
                mobCount: clampPackMobCount(
                    (defaultPackSize + Math.floor(this.seededRandom(packSeed + 999) * 2)) * packMulClamped
                ),
                archetype: 'melee',
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

    resetWorld() {

        // 1. Remove chunks
        for (const [, chunk] of this.loadedChunks) {
            if (chunk.parent) {
                chunk.parent.removeChild(chunk);
            }
            chunk.destroy({children: true});
        }

        this.loadedChunks.clear();
        this.spawnedEntities.clear();
        this.chunkData.clear();

        // 2. Remove all props
        this.propManager?.clear?.();

        // 3. Remove interactables
        this.interactablePropManager?.clear?.();
        this.totemWaveEvent?.cancel?.();

        for (const m of this.entitiesList?.mobs || []) {
            this.worldObjects.destroyMob(m);
        }

        // Keep the same array reference — combat/abilities hold a closure to entities.mobs from init.
        this.entitiesList.mobs.length = 0;

        for (const boss of [...(this.entitiesList?.bosses || [])]) {
            boss.destroy?.(this.entitiesList?.bossTotems ?? []);
            boss.c?.destroy?.({ children: true });
        }
        if (this.entitiesList?.bosses) this.entitiesList.bosses.length = 0;
        if (this.entitiesList?.bossTotems) this.entitiesList.bossTotems.length = 0;

        this.worldObjects.clearColliders();
        this._bossRewardChestKeys?.clear();
        useGameStore.getState().clearBossEncounter?.();

        // 6. Reset chunks tracking
        this.worldData.chunks.clear();

        // 7. Reset procedural systems state
        this.pendingChunks.clear();
        this.lastPlayerChunk = null;

        console.log("WORLD RESET DONE");
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    drawChunkDebug(centerChunkX, centerChunkZ) {
        const g = this.chunkDebugGraphics;
        g.clear();

        const size = this.chunkSize * this.tileSize;
        const range = this.renderDistance;

        for (let dx = -range; dx <= range; dx++) {
            for (let dz = -range; dz <= range; dz++) {

                const chunkX = centerChunkX + dx;
                const chunkZ = centerChunkZ + dz;

                const x = chunkX * size;
                const y = chunkZ * size;

                // rectangle outline
                g.rect(x, y, size, size);
                g.stroke({width: 2, color: 0x00ff00});

                // optional center dot
                g.circle(x + size / 2, y + size / 2, 4);
                g.fill(0xff0000);
            }
        }
    }

    getBiomeAt(x, z) {
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const chunkX = Math.floor(x / chunkSizeWorld);
        const chunkZ = Math.floor(z / chunkSizeWorld);
        return getBiomeForChunk(chunkX, chunkZ, this.worldSeed);
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

    async generateChunk(chunkX, chunkZ, chunkData = null) {
        const chunkContainer = new Container();

        const startX = chunkX * this.chunkSize * this.tileSize;
        const startZ = chunkZ * this.chunkSize * this.tileSize;

        const chunkWidth = this.chunkSize * this.tileSize;
        const chunkHeight = this.chunkSize * this.tileSize;

        const biome = this.getBiomeAtChunk(chunkX, chunkZ);

        const biomeColor = this.getBiomeColor(biome);
        const texture = await this.getBiomeTexture(biome);

        //
        // BASE GROUND COLOR
        // Always render this first
        //
        const baseGround = new Graphics();

        baseGround
            .rect(0, 0, chunkWidth, chunkHeight)
            .fill({ color: biomeColor });

        baseGround.x = startX;
        baseGround.y = startZ;

        chunkContainer.addChild(baseGround);

        //
        // TEXTURE OVERLAY
        // Blend softly on top instead of tinting the texture fully
        //
        if (texture) {
            const overlay = new TilingSprite({
                texture,
                width: chunkWidth,
                height: chunkHeight,
            });

            overlay.x = startX;
            overlay.y = startZ;

            //
            // IMPORTANT:
            // Offset texture so all chunks connect seamlessly
            //
            overlay.tilePosition.set(-startX, -startZ);

            //
            // Very subtle alpha
            //
            let textureAlpha = 0.17;

            if (biome === 'ice') {
                textureAlpha = 0.25
            }

            if (biome === 'desert') {
                textureAlpha = 0.1
            }


            overlay.alpha = textureAlpha;

            //
            // Slight tint variation instead of exact biome color
            // Makes texture retain detail
            //
            overlay.tint = 0xffffff;

            //
            // Use multiply for grounded detail
            // Alternatives:
            // "overlay", "soft-light" if you add custom blend modes later
            //

            overlay.blendMode = 'multiply';

            chunkContainer.addChild(overlay);
        }

        const lakes =
            chunkData?.lakes ??
            this.chunkData.get(`${chunkX},${chunkZ}`)?.lakes ??
            [];

        if (lakes.length > 0) {
            await renderLakesIntoChunk(
                chunkContainer,
                lakes,
                chunkX,
                chunkZ,
                this.tileSize,
                this.chunkSize
            );
        }

        return chunkContainer;
    }

    /**
     * @param {string} chunkKey
     * @param {import('./lakes/lakeGen.js').LakeInstance[]} lakes
     */
    registerLakeColliders(chunkKey, lakes) {
        if (!lakes?.length) return;

        for (const lake of lakes) {
            const shape = buildLakeRenderShape(lake);
            const bounds = getLakeShapeBounds(shape);

            this.colliders.push({
                x: lake.x,
                y: lake.z,
                z: lake.z,
                width: bounds.width,
                height: bounds.height,
                rotation: lake.rotation,
                shape,
                collision: true,
                blocksMovement: true,
                blocksProjectiles: false,
                type: 'lake',
                chunkKey,
                isLakePolygon: true,
            });
        }
    }

    removeLakeCollidersForChunk(chunkKey) {
        for (let i = this.colliders.length - 1; i >= 0; i--) {
            const c = this.colliders[i];
            if (c.chunkKey === chunkKey && c.type === 'lake') {
                this.colliders.splice(i, 1);
            }
        }
    }

    getBiomeAtChunk(chunkX, chunkZ) {
        return getBiomeForChunk(chunkX, chunkZ, this.worldSeed);
    }

    cullExcessMobs(playerX, playerZ) {
        const mobs = this.entitiesList?.mobs;
        if (!mobs?.length) return;

        const excess = mobs.length - MAX_ACTIVE_MOBS;
        if (excess <= 0) return;

        const toRemove = pickMobsToCull(mobs, playerX, playerZ, excess);
        for (const mob of toRemove) {
            const idx = mobs.indexOf(mob);
            if (idx > -1) mobs.splice(idx, 1);

            const chunkKey = mob.spawnChunk;
            if (chunkKey) {
                const bucket = this.spawnedEntities.get(chunkKey);
                if (bucket?.mobs) {
                    const ci = bucket.mobs.indexOf(mob);
                    if (ci > -1) bucket.mobs.splice(ci, 1);
                }
            }

            this.worldObjects.destroyMob(mob);
        }
    }

    async spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, chunkData) {
        const key = `${chunkX},${chunkZ}`;
        const difficulty = chunkData.difficulty ?? getChunkDifficulty(chunkX, chunkZ);

        if (this.spawnedEntities.has(key)) return;

        const entities = {mobs: []};
        let chunkSpawned = 0;
        const chunkBudget = Math.min(
            getMaxMobsPerChunk(difficulty),
            getRemainingMobBudget(this.entitiesList.mobs.length)
        );

        if (chunkBudget <= 0) {
            this.spawnedEntities.set(key, entities);
            return;
        }

        const chunkPlaced = [];

        for (let pi = 0; pi < chunkData.packs.length; pi++) {
            const pack = chunkData.packs[pi];

            for (let i = 0; i < pack.mobCount; i++) {
                if (
                    chunkSpawned >= chunkBudget ||
                    this.entitiesList.mobs.length >= MAX_ACTIVE_MOBS
                ) {
                    break;
                }

                let x = 0;
                let z = 0;
                let mobSeed = 0;
                let placedOk = false;

                for (let attempt = 0; attempt < 10; attempt++) {
                    mobSeed =
                        chunkData.seed ^
                        (pi * 7919) ^
                        (i * 7933) ^
                        (attempt * 12011) ^
                        (Math.floor(pack.x) * 17) ^
                        (Math.floor(pack.z) * 31);

                    const angle = this.seededRandom(mobSeed) * Math.PI * 2;
                    const dist = (0.35 + this.seededRandom(mobSeed + 424242) * 0.65) * pack.radius;

                    x = pack.x + Math.cos(angle) * dist;
                    z = pack.z + Math.sin(angle) * dist;

                    if (!isMobSpawnTooClose(x, z, chunkPlaced)) {
                        placedOk = true;
                        break;
                    }
                }

                if (!placedOk) continue;

                // TODO: Dont respawn mobs that are killed
                //if (this.persistedMobs.has(mobId)) continue;

                // Check if collision is ok for spawn
                const isBlocked = this.worldObjects.colliders.some(c => {
                    if (!c.collision || c.type === 'lake') return false;

                    if ((c.isPropPolygon || c.isLakePolygon) && c.shape) {
                        return isCircleOverlappingLake(x, z, MOB_RADIUS, {
                            x: c.x,
                            z: c.z ?? c.y,
                            rotation: c.rotation ?? 0,
                            shape: c.shape,
                        });
                    }

                    const dx = c.x - x;
                    const dy = c.y - z;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const minDist = Math.max(c.width || 40, c.height || 40) * 0.5;
                    return d < minDist;
                });

                if (isBlocked) continue;

                const chunkLakes = chunkData.lakes ?? [];
                if (isPointInLake(x, z, chunkLakes)) continue;

                const mob = this.worldObjects.spawnMob(
                    x,
                    z,
                    chunkData.biome,
                    '',
                    difficulty,
                    mobSeed
                );

                if (mob) {
                    mob.spawnChunk = key;
                    mob.packId = `${key}_${pack.x}_${pack.z}`;

                    entities.mobs.push(mob);
                    chunkPlaced.push({ x, z });

                    this.entitiesList.mobs.push(mob);
                    chunkSpawned++;
                }
            }

            if (
                chunkSpawned >= chunkBudget ||
                this.entitiesList.mobs.length >= MAX_ACTIVE_MOBS
            ) {
                break;
            }
        }

        this.spawnedEntities.set(key, entities);
    }

    shouldGenerateProceduralChunks() {
        return this.worldMode === 'procedural';
    }


    async update(playerX, playerZ, dt) {
        if (!this.initialized) return;
        const debugEnabled = useGameStore.getState().debug.enabled;

        const now = Date.now();
        const chunkSizeWorld = this.chunkSize * this.tileSize;
        const centerChunkX = Math.floor(playerX / chunkSizeWorld);
        const centerChunkZ = Math.floor(playerZ / chunkSizeWorld);

        // Debug only
        if (debugEnabled) {
            this.drawChunkDebug(centerChunkX, centerChunkZ);
        } else {
            this.chunkDebugGraphics.clear();
        }

        // 🔥 CHECK FOR CHUNK CHANGE (null last chunk ⇒ first sample ⇒ apply weather immediately)
        const chunkMoved =
            this.lastPlayerChunk == null ||
            centerChunkX !== this.lastPlayerChunk.x ||
            centerChunkZ !== this.lastPlayerChunk.z;

        if (chunkMoved) {
            // Get the new biome
            const newBiome = this.getBiomeAtChunk(centerChunkX, centerChunkZ);
            const oldBiome = this.lastPlayerChunk?.biome;

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

            const chunkData = this.chunkData.get(chunkKey);
            const landscape = chunkData?.landscapeProfile;

            if (this.onChunkChangeCallback) {
                this.onChunkChangeCallback({
                    chunkX: centerChunkX,
                    chunkZ: centerChunkZ,
                    biome: newBiome,
                    landscapeId: landscape?.id ?? null,
                    landscapeLabel: landscape?.label ?? null,
                    x: centerChunkX * chunkSizeWorld,
                    z: centerChunkZ * chunkSizeWorld,
                    oldChunkX: this.lastPlayerChunk?.x ?? centerChunkX,
                    oldChunkZ: this.lastPlayerChunk?.z ?? centerChunkZ,
                    oldBiome: this.lastPlayerChunk?.biome,
                    mobCount: mobCount,
                    propCount: propCount,
                    weather: weather,
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

                    if (this.shouldGenerateProceduralChunks()) {
                        this.pendingChunks.add(key);
                    } else if (this.worldData.chunks.has(key)) {
                        // loaded world: only enqueue if it exists in JSON
                        this.pendingChunks.add(key);
                    }
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

        this.cullExcessMobs(playerX, playerZ);

        // Only update mobs in loaded chunks near the player
        for (const m of this.entitiesList.mobs) {
            if (!m?.c) continue;

            const visible = shouldRenderMob(m, playerX, playerZ);
            m.c.visible = visible;
            if (!visible) continue;

            if (this.editor.enabled) continue;

            const mobChunkX = Math.floor(m.x / chunkSizeWorld);
            const mobChunkZ = Math.floor(m.y / chunkSizeWorld);
            if (!activeChunks.has(`${mobChunkX},${mobChunkZ}`)) continue;

            if (!shouldSimulateMob(m, playerX, playerZ)) continue;

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

        this.totemWaveEvent?.update(dt ?? 0);

        // Interactable props
        this.interactablePropManager.update(playerX, playerZ, dt ?? 0);

        tickLakeWaterAnimations(dt ?? 0);
    }

    async unloadChunk(key) {
        const chunk = this.loadedChunks.get(key);
        if (!chunk) return;

        // FIX: Destroy the chunk directly (it IS the ground)
        if (chunk.parent) {
            this.groundLayer.removeChild(chunk);
        }
        clearLakeAnimatorsForChunk(chunk);
        chunk.destroy({children: true});

        // Unload props (this is handled correctly)
        this.propManager.unloadChunkProps(key);

        // Unload interactable props
        this.interactablePropManager.unloadChunkProps(key);

        this.removeLakeCollidersForChunk(key);

        const entities = this.spawnedEntities.get(key);
        if (entities?.boss && !entities.boss.dead) {
            const bi = this.entitiesList.bosses.indexOf(entities.boss);
            if (bi !== -1) this.entitiesList.bosses.splice(bi, 1);
            entities.boss.destroy?.(this.entitiesList?.bossTotems ?? []);
            this.worldObjects.removeFromParent(entities.boss.c);
            entities.boss.c?.destroy?.({ children: true });
        }

        // Remove mobs
        if (entities) {
            for (const mob of entities.mobs) {
                const index = this.entitiesList?.mobs?.indexOf(mob);
                if (index > -1) {
                    this.entitiesList.mobs.splice(index, 1);
                }
                this.worldObjects.destroyMob(mob);
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

        // 1. Editor / loaded world has priority
        if (this.worldMode === "loaded" && this.worldData.chunks.has(key)) {
            const data = this.worldData.chunks.get(key);
            return this.loadEditorChunk(chunkX, chunkZ, data);
        }

        // 2. Procedural fallback
        return this.loadProceduralChunk(chunkX, chunkZ, playerX, playerZ);
    }

    loadWorldFromJson(data) {

        this.worldMode = "loaded";

        // 🔥 IMPORTANT: wipe old procedural world first
        this.resetWorld();

        this.worldData.chunks.clear();

        for (const chunk of data.chunks) {
            const key = `${chunk.chunkX},${chunk.chunkZ}`;
            this.worldData.chunks.set(key, chunk);
        }

        this.loadedChunks.clear();

        // force reload center area
        this.update(0, 0);
    }

    async loadProceduralChunk(chunkX, chunkZ, playerX, playerZ) {
        const key = `${chunkX},${chunkZ}`;
        const chunkData = this.generateChunkData(chunkX, chunkZ);
        const chunk = await this.generateChunk(chunkX, chunkZ, chunkData);

        this.groundLayer.addChild(chunk);
        this.registerLakeColliders(key, chunkData.lakes ?? []);

        const landscapeContext = {
            profile: chunkData.landscapeProfile,
            anchors: chunkData.layoutAnchors,
            difficulty: chunkData.difficulty,
            contentScales: chunkData.contentScales,
            lakes: chunkData.lakes ?? [],
        };

        await this.propManager.generateChunkProps(
            chunkX,
            chunkZ,
            chunkData.biome,
            this.chunkSize,
            this.tileSize,
            landscapeContext
        );

        if (!landscapeContext.profile?.skipInteractables) {
            await this.interactablePropManager.generateChunkProps(
                chunkX,
                chunkZ,
                chunkData.biome,
                this.chunkSize,
                this.tileSize,
                landscapeContext
            );
        }

        if (landscapeContext.profile?.spawnBoss) {
            loadBossChunkContent(this, chunkX, chunkZ, chunkData);
        } else {
            await this.spawnMobsInChunk(chunkX, chunkZ, playerX, playerZ, chunkData);
        }

        this.loadedChunks.set(key, chunk);
    }

    async loadEditorChunk(chunkX, chunkZ, data) {
        const key = `${chunkX},${chunkZ}`;

        const chunk = new Container();

        const biome = data.biome || "forest";
        const size = this.chunkSize * this.tileSize;
        const color = this.getBiomeColor(biome);

        const worldX = chunkX * size;
        const worldY = chunkZ * size;

        const rect = new Graphics();

        rect.rect(worldX, worldY, size, size);
        rect.fill(color);

        chunk.addChild(rect);

        this.groundLayer.addChild(chunk);

        // ===== PROPS (shadows + gameplay colliders match procedural props) =====
        for (const p of data.props || []) {
            this.propManager.placeLoadedProp(p, key, biome);
        }

        // ===== INTERACTABLES =====
        for (const it of data.interactables || []) {
            this.interactablePropManager.spawnManualProp(
                it.id,
                it.x,
                it.y,
                it.scale ?? 1,
                key
            );
        }

        // ===== MOBS =====
        for (const m of data.mobs || []) {
            const mob = this.worldObjects.spawnMob(
                m.x,
                m.y,
                biome,
                m.archetype,
                1,
                this.worldSeed ^ (Math.floor(m.x * 17) ^ Math.floor(m.y * 31))
            );

            this.entitiesList.mobs.push(mob);
        }

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