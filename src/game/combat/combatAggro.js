/** Ms to stay in combat after being hit from outside normal aggro range. */
export const MOB_AGGRO_STICK_MS = 16_000;
export const BOSS_AGGRO_STICK_MS = 45_000;

/**
 * @param {object} mob
 */
export function applyMobCombatAggro(mob) {
    if (!mob || mob.hp <= 0) return;
    mob.aggroPlayerUntil = performance.now() + MOB_AGGRO_STICK_MS;
    mob.controller?.forceChase?.();
}

/**
 * @param {object} boss
 */
export function applyBossCombatAggro(boss) {
    if (!boss || boss.dead) return;
    boss.aggroPlayerUntil = performance.now() + BOSS_AGGRO_STICK_MS;
    boss.forceChase?.();
}

/**
 * @param {{ aggroPlayerUntil?: number }} entity
 */
export function isCombatAggroLocked(entity) {
    return performance.now() < (entity?.aggroPlayerUntil ?? 0);
}
