/**
 * World difficulty (distance from spawn), randomized biome regions, and content scaling.
 */

export const MAX_WORLD_DIFFICULTY = 50;
/** Chunks per biome region edge (~26 chunk-wide zones). */
export const BIOME_REGION_CHUNKS = 26;
/** Chunk distance from origin until difficulty reaches max. */
export const DIFFICULTY_RAMP_CHUNKS = 100;

/** All procedural biomes — any can appear at spawn depending on world seed. */
export const WORLD_BIOMES = ['forest', 'desert', 'ice', 'lava'];

/** @param {number} chunkX */
/** @param {number} chunkZ */
export function getChunkLevel(chunkX, chunkZ) {
    return Math.floor(Math.sqrt(chunkX * chunkX + chunkZ * chunkZ));
}

/**
 * World difficulty from distance (spawn ≈ 0,0). Early chunks stay at 1 longer.
 * @param {number} chunkX
 * @param {number} chunkZ
 */
export function getChunkDifficulty(chunkX, chunkZ) {
    const level = getChunkLevel(chunkX, chunkZ);
    if (level <= 2) return 1;

    const t = Math.min(1, (level - 2) / DIFFICULTY_RAMP_CHUNKS);
    const raw = 1 + t * (MAX_WORLD_DIFFICULTY - 1);
    return Math.min(MAX_WORLD_DIFFICULTY, Math.max(1, Math.round(raw * 10) / 10));
}

/** Monster level badge ≈ world difficulty. */
export function getMonsterLevel(worldDifficulty) {
    return Math.max(1, Math.round(worldDifficulty ?? 1));
}

/**
 * @param {number} rx Region index (chunkX / BIOME_REGION_CHUNKS)
 * @param {number} rz Region index (chunkZ / BIOME_REGION_CHUNKS)
 * @param {number} worldSeed
 */
function hashRegionBiome(rx, rz, worldSeed) {
    let h = (worldSeed | 0) ^ Math.imul(rx | 0, 73856093) ^ Math.imul(rz | 0, 19349663);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
}

/**
 * Deterministic biome per map region from world seed (not difficulty).
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {number} [worldSeed=0]
 */
export function getBiomeForChunk(chunkX, chunkZ, worldSeed = 0) {
    const rx = Math.floor(chunkX / BIOME_REGION_CHUNKS);
    const rz = Math.floor(chunkZ / BIOME_REGION_CHUNKS);
    const h = hashRegionBiome(rx, rz, worldSeed);
    return WORLD_BIOMES[h % WORLD_BIOMES.length];
}

/** Biome at the default spawn chunk (0, 0) for this world seed. */
export function getSpawnBiome(worldSeed = 0) {
    return getBiomeForChunk(0, 0, worldSeed);
}

/**
 * Scales spawns, resources, and loot by world difficulty (tuned for slower early game).
 * @param {number} difficulty 1–MAX_WORLD_DIFFICULTY
 */
export function getWorldContentScales(difficulty) {
    const d = Math.min(MAX_WORLD_DIFFICULTY, Math.max(1, difficulty ?? 1));
    const t = (d - 1) / (MAX_WORLD_DIFFICULTY - 1);
    const early = d <= 3;
    const earlyEase = early ? (3 - d) / 2 : 0;

    return {
        mobPackChanceMul: (early ? 0.78 : 0.35) + t * 0.55,
        mobPackCountMul: (early ? 1.35 : 0.5) + t * 0.4 + earlyEase * 0.4,
        mobPackSizeMul: (early ? 1.05 : 0.45) + t * 0.4 + earlyEase * 0.35,
        interactableIntensityMul: 0.42 + t * 0.58,
        interactableMaxMul: 0.5 + t * 0.5,
        lootMultiplier: 0.38 + t * 0.62,
        landscapeDensityMul: 0.55 + t * 0.45,
        /** Extra trees/bushes in forest biome chunks. */
        forestFoliageMul: 2.35,
    };
}
