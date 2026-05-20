/**
 * Mob population limits and difficulty → pack size scaling (performance).
 */

/** Hard cap on mobs alive in the world at once. */
export const MAX_ACTIVE_MOBS = 300;

/** Max mobs spawned when a single chunk loads. */
export const MAX_MOBS_PER_CHUNK = 75;

/** Target cap for low-difficulty chunks (spawn area). */
export const EARLY_MAX_MOBS_PER_CHUNK = 10;

/** Minimum spacing between mob spawn points in the same chunk (world px). */
export const MIN_MOB_SPAWN_SPACING = 56;

/** Max mobs in one pack definition. */
export const MAX_MOBS_PER_PACK = 25;

/** Max packs per dense chunk. */
export const MAX_PACKS_PER_DENSE_CHUNK = 3;

/** Full AI / movement updates only within this radius (px). */
export const MOB_SIM_RADIUS = 1500;

/** Hide mob visuals beyond this radius (px). */
export const MOB_RENDER_RADIUS = 2000;

const MOB_SIM_RADIUS_SQ = MOB_SIM_RADIUS * MOB_SIM_RADIUS;
const MOB_RENDER_RADIUS_SQ = MOB_RENDER_RADIUS * MOB_RENDER_RADIUS;

/**
 * Softer pack size than `difficulty * mul` (avoids 10+ mobs per pack at diff 10).
 * @param {number} difficulty
 * @param {{ mobPackSizeMul?: number }} [contentScales]
 */
export function computePackSizeScale(difficulty, contentScales) {
    const d = Math.max(1, difficulty ?? 1);
    const mul = contentScales?.mobPackSizeMul ?? 1;
    const earlyDampen = d <= 3 ? 0.62 + d * 0.11 : 1;
    const linear = (d - 1) * 1.05 * mul;
    const curve = Math.sqrt(d - 1) * 1.35 * mul;
    return Math.max(2, (2 + linear + curve) * earlyDampen);
}

/**
 * Per-chunk mob cap — stays near {@link EARLY_MAX_MOBS_PER_CHUNK} at low difficulty.
 * @param {number} difficulty
 */
export function getMaxMobsPerChunk(difficulty) {
    const d = Math.max(1, difficulty ?? 1);
    if (d <= 2) return EARLY_MAX_MOBS_PER_CHUNK;
    if (d <= 5) return Math.round(EARLY_MAX_MOBS_PER_CHUNK + (d - 2) * 5);
    if (d <= 12) return Math.round(25 + (d - 5) * 4);
    return Math.min(MAX_MOBS_PER_CHUNK, Math.round(53 + (d - 12) * 2.5));
}

/**
 * Trim pack mob counts so a chunk does not exceed the difficulty budget.
 * @param {Array<{ mobCount: number }>} packs
 * @param {number} maxTotal
 */
export function capPackMobCounts(packs, maxTotal) {
    if (!packs?.length || maxTotal <= 0) return packs ?? [];

    const capped = packs.map((p) => ({ ...p }));
    let total = capped.reduce((sum, p) => sum + p.mobCount, 0);
    if (total <= maxTotal) return capped;

    while (total > maxTotal) {
        let pick = 0;
        let best = capped[0]?.mobCount ?? 0;
        for (let i = 1; i < capped.length; i++) {
            if (capped[i].mobCount > best) {
                best = capped[i].mobCount;
                pick = i;
            }
        }
        if (best <= 1) break;
        capped[pick].mobCount--;
        total--;
    }

    return capped;
}

/**
 * @param {number} x
 * @param {number} z
 * @param {Array<{ x: number, z: number }>} placed
 * @param {number} [minDist=MIN_MOB_SPAWN_SPACING]
 */
export function isMobSpawnTooClose(x, z, placed, minDist = MIN_MOB_SPAWN_SPACING) {
    const minSq = minDist * minDist;
    for (const p of placed) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < minSq) return true;
    }
    return false;
}

/**
 * @param {number} raw
 * @param {number} [max=MAX_MOBS_PER_PACK]
 */
export function clampPackMobCount(raw, max = MAX_MOBS_PER_PACK) {
    return Math.max(1, Math.min(max, Math.floor(raw)));
}

/**
 * @param {number} mobCount
 */
export function getRemainingMobBudget(mobCount) {
    return Math.max(0, MAX_ACTIVE_MOBS - mobCount);
}

/**
 * @param {object} mob
 * @param {number} px
 * @param {number} py
 */
export function mobDistSqToPlayer(mob, px, py) {
    const dx = mob.x - px;
    const dy = mob.y - py;
    return dx * dx + dy * dy;
}

/**
 * @param {object} mob
 * @param {number} px
 * @param {number} py
 */
export function shouldSimulateMob(mob, px, py) {
    return mobDistSqToPlayer(mob, px, py) <= MOB_SIM_RADIUS_SQ;
}

/**
 * @param {object} mob
 * @param {number} px
 * @param {number} py
 */
export function shouldRenderMob(mob, px, py) {
    return mobDistSqToPlayer(mob, px, py) <= MOB_RENDER_RADIUS_SQ;
}

/**
 * Remove farthest mobs when over cap (keeps combat fair near the player).
 * @param {object[]} mobs
 * @param {number} px
 * @param {number} py
 * @param {number} removeCount
 */
export function pickMobsToCull(mobs, px, py, removeCount) {
    if (removeCount <= 0 || !mobs?.length) return [];

    const ranked = mobs
        .map((mob) => ({ mob, d: mobDistSqToPlayer(mob, px, py) }))
        .sort((a, b) => b.d - a.d);

    return ranked.slice(0, removeCount).map((e) => e.mob);
}
