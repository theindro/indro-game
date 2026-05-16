/**
 * Chunk landscape profile selection and prop-pool helpers.
 */
import {
    BIOME_CHUNK_PROFILES,
    DEFAULT_CHUNK_PROFILE,
} from './chunkProfiles.data.js';
import { seededRandom, chunkSeed, computeLayoutAnchors } from './chunkPlacement.js';

export { computeLayoutAnchors, chunkSeed, seededRandom } from './chunkPlacement.js';
export { BIOME_CHUNK_PROFILES, DEFAULT_CHUNK_PROFILE } from './chunkProfiles.data.js';

/**
 * Deterministic profile roll for a chunk (same seed ⇒ same profile).
 *
 * @param {string} biome
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {number} worldSeed
 */
export function pickChunkProfile(biome, chunkX, chunkZ, worldSeed) {
    const list = BIOME_CHUNK_PROFILES[biome];
    if (!list?.length) return { ...DEFAULT_CHUNK_PROFILE };

    const seed = chunkSeed(chunkX, chunkZ, worldSeed);
    const r = seededRandom(seed + 99991);
    const totalWeight = list.reduce((s, p) => s + p.weight, 0);
    let cumulative = 0;

    for (const profile of list) {
        cumulative += profile.weight / totalWeight;
        if (r <= cumulative) return profile;
    }

    return list[list.length - 1];
}

/**
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 * @param {Record<string, import('./propConfig.data.js').PROP_TYPES[keyof typeof import('./propConfig.data.js').PROP_TYPES]>} propTypes
 */
export function buildPropPool(profile, propTypes) {
    const pool = [];
    for (const def of profile.props ?? []) {
        const type = propTypes[def.type];
        if (!type) continue;
        for (let i = 0; i < def.weight; i++) {
            pool.push({ typeKey: def.type, propType: type });
        }
    }
    return pool;
}

/**
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 * @param {{ variants?: string[] }} propType
 * @param {number} seed
 */
export function pickVariantAssetId(profile, propType, seed) {
    const variants = propType.variants;
    if (!variants?.length) return propType.name;

    const bias = profile.variantBias;
    if (!bias) {
        return variants[Math.floor(seededRandom(seed) * variants.length)];
    }

    const weighted = [];
    for (const id of variants) {
        const w = Math.max(0.1, bias[id] ?? 1);
        for (let i = 0; i < Math.ceil(w * 10); i++) {
            weighted.push(id);
        }
    }
    return weighted[Math.floor(seededRandom(seed) * weighted.length)] ?? variants[0];
}

/**
 * Effective min distance for placement (profile can tighten groves).
 *
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 * @param {string} typeKey
 * @param {{ minDistance?: number }} propType
 */
export function getSpacingDistance(profile, typeKey, propType) {
    const base = propType.minDistance ?? 40;
    const scale = profile.spacingScale?.[typeKey] ?? 1;
    return Math.max(18, base * scale);
}

/**
 * Target decorative prop count for a chunk.
 *
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 */
export function getTargetPropCount(profile) {
    if (profile.arenaPlacements?.length) return 0;
    const base = profile.basePropCount ?? 22;
    return Math.max(4, Math.floor(base * (profile.density ?? 0.75)));
}

/** @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile */
export function usesArenaLayout(profile) {
    return !!(profile.arenaPlacements?.length);
}

/**
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 * @param {string} category
 * @param {number} baseIntensity
 */
export function scaleInteractableIntensity(profile, category, baseIntensity) {
    const mul = profile.interactableScale?.[category] ?? 1;
    return Math.min(1, baseIntensity * mul);
}
