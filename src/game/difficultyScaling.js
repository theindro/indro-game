/**
 * Chunk distance → combat scaling (shared by mobs and bosses).
 */

import {
    MOB_HP,
    MOB_BASE_SPEED_SCALE,
    BOSS_HP,
    BOSS_SPEED,
    DIFFICULTY,
} from './constants.js';

export {
    getChunkLevel,
    getChunkDifficulty,
    getMonsterLevel,
    MAX_WORLD_DIFFICULTY,
    getWorldContentScales,
    getBiomeForChunk,
    getBiomeForDifficulty,
} from './world/worldProgression.js';

/** @param {number} difficulty */
export function getDamageScale(difficulty) {
    return 1 + Math.log2(difficulty + 1) * 0.35;
}

/** @param {number} difficulty */
export function getDifficultySpeedMul(difficulty) {
    return 1 + Math.min(difficulty * 0.05, 0.5);
}

/** Higher = faster attacks (mob attackSpeed divisor / boss interval divisor). */
export function getDifficultyAttackSpeedMul(difficulty) {
    return 1 + difficulty * 0.1;
}

/**
 * @param {import('./controllers/mobArchetypes/index.js').ARCHETYPE_STATS[keyof typeof ARCHETYPE_STATS]} stats
 * @param {number} difficulty
 */
export function applyMobDifficulty(stats, difficulty) {
    const damageScale = getDamageScale(difficulty);
    return {
        hp: MOB_HP * stats.hpMultiplier * difficulty,
        speed: MOB_BASE_SPEED_SCALE * stats.speedMultiplier * getDifficultySpeedMul(difficulty),
        attackSpeed: DIFFICULTY.attackCooldown * getDifficultyAttackSpeedMul(difficulty),
        damage: Math.round(stats.damage * damageScale),
        damageScale,
    };
}

/**
 * @param {number} difficulty
 * @param {number} [visualScale=1] Boss profile size multiplier (separate from distance scaling).
 */
export function applyBossDifficulty(difficulty, visualScale = 1) {
    const damageScale = getDamageScale(difficulty);
    const attackSpeedMul = getDifficultyAttackSpeedMul(difficulty);
    return {
        maxHp: BOSS_HP * visualScale * difficulty,
        speed: BOSS_SPEED * (1 / visualScale) * getDifficultySpeedMul(difficulty),
        damageScale,
        attackSpeedMul,
        difficulty,
    };
}

/** @param {number} baseDamage */
/** @param {number} damageScale */
export function scaleBossDamage(baseDamage, damageScale) {
    return Math.max(1, Math.round(baseDamage * damageScale));
}
