/**
 * World difficulty (1–10 from spawn), large biome regions, and content scaling.
 */

export const MAX_WORLD_DIFFICULTY = 10;
/** Chunks per biome region edge (~24–30 chunk wide zones). */
export const BIOME_REGION_CHUNKS = 26;
/** Chunk distance from origin until difficulty reaches 10. */
export const DIFFICULTY_RAMP_CHUNKS = 30;

/** @param {number} chunkX */
/** @param {number} chunkZ */
export function getChunkLevel(chunkX, chunkZ) {
    return Math.floor(Math.sqrt(chunkX * chunkX + chunkZ * chunkZ));
}

/**
 * World difficulty 1–10 from distance (spawn ≈ 0,0). Early chunks stay at 1 longer.
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

/** Monster level badge = difficulty × 5 (diff 10 → Lv 50). */
export function getMonsterLevel(worldDifficulty) {
    return Math.max(1, Math.round((worldDifficulty ?? 1)));
}

/**
 * Single biome for a difficulty band.
 * Forest ≤3, ice (3,5], desert (5,8], lava >8.
 * @param {number} difficulty
 */
export function getBiomeForDifficulty(difficulty) {
    const d = Math.min(MAX_WORLD_DIFFICULTY, Math.max(1, difficulty ?? 1));
    if (d <= 3) return 'forest';
    if (d <= 5) return 'ice';
    if (d <= 8) return 'desert';
    return 'lava';
}

/**
 * @param {number} difficulty
 * @returns {string[]}
 */
export function getAllowedBiomesForDifficulty(difficulty) {
    return [getBiomeForDifficulty(difficulty)];
}

/**
 * Large coherent biome per region (not per-chunk noise).
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {number} _worldSeed
 */
export function getBiomeForChunk(chunkX, chunkZ, _worldSeed) {
    const d = getChunkDifficulty(chunkX, chunkZ);
    // Integer tier bands ≈ several chunks wide (smoother than 0.1 steps, matches difficulty UI).
    return getBiomeForDifficulty(Math.floor(d));
}

/**
 * Scales spawns, resources, and loot by world difficulty (tuned for slower early game).
 * @param {number} difficulty 1–10
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
