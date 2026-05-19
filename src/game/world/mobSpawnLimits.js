/**
 * Mob population limits and difficulty → pack size scaling (performance).
 */

/** Hard cap on mobs alive in the world at once. */
export const MAX_ACTIVE_MOBS = 300;

/** Max mobs spawned when a single chunk loads. */
export const MAX_MOBS_PER_CHUNK = 75;

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
    return 1 + Math.sqrt(d - 1) * 1.75 * mul;
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
