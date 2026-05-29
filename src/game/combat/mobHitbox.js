import { BOSS_RADIUS } from '../constants.js';

/** Combat / hover radius multiplier on mob.size (visual is often smaller). */
export const MOB_HIT_RADIUS_MULT = 1.5;
export const MOB_HIT_RADIUS_MIN = 22;
export const MOB_HIT_RADIUS_BONUS = 4;

export const BOSS_HIT_RADIUS_MULT = 1.22;
export const BOSS_HIT_RADIUS_MIN = 44;

/**
 * Radius for arrow hits, abilities, and pointer hover (world px).
 * @param {{ size?: number, isElite?: boolean }} mob
 */
export function getMobHitRadius(mob) {
    const base = mob?.size ?? 13;
    let r = Math.max(MOB_HIT_RADIUS_MIN, base * MOB_HIT_RADIUS_MULT + MOB_HIT_RADIUS_BONUS);
    if (mob?.isElite) r *= 1.1;
    return r;
}

/**
 * @param {{ radius?: number }} boss
 */
export function getBossHitRadius(boss) {
    const visual = boss?.radius ?? BOSS_RADIUS;
    return Math.max(BOSS_HIT_RADIUS_MIN, visual * BOSS_HIT_RADIUS_MULT);
}
