/**
 * Elite mobs — any archetype can roll elite on spawn (difficulty-based chance).
 */

import { Container } from 'pixi.js';
import { useGameStore } from '../../stores/gameStore.js';
import { mobSeededUnit } from '../controllers/createMobController.js';
import { getMobExpReward } from '../difficultyScaling.js';
import { LOOT_BEAM_BY_RARITY } from '../vfx/lootBeam.js';
import { applyEliteHitDebuff } from '../combat/playerDebuffs.js';
import { VFX } from '../GlobalEffects.js';

export const ELITE_HP_MULT = 10;
export const ELITE_COMBAT_MULT = 3;
export const ELITE_SIZE_MULT = 1.5;

/** @typedef {'burn'|'poison'|'freeze'} EliteType */

export const ELITE_TYPES = /** @type {const} */ (['burn', 'poison', 'freeze']);

/** Loot-drop theme per elite element (sprite glow). */
const ELITE_AURA_RARITY = {
    burn: 'Legendary',
    poison: 'Magic',
    freeze: 'Rare',
};

const ELITE_AURA_COLORS = {
    burn: 0xf39c12,
    poison: 0x2ecc71,
    freeze: 0x3498db,
};

const ELITE_SPRITE_GLOW_SCALE = 0.4;

function removeMobGroundShadow(mob) {
    if (!mob?.shadow) return;
    if (mob.shadow.parent) {
        mob.shadow.parent.removeChild(mob.shadow);
    }
    mob.shadow.destroy();
    mob.shadow = null;
}

/**
 * Spawn chance 0–1 by world difficulty (very low at 1, mid ~10, high 20+).
 * @param {number} difficulty
 */
export function getEliteSpawnChance(difficulty) {
    const d = Math.max(1, difficulty ?? 1);
    if (d <= 1) return 0.004;
    if (d <= 5) return 0.004 + (d - 1) * 0.002;
    if (d <= 10) return 0.012 + (d - 5) * 0.006;
    if (d <= 20) return 0.042 + (d - 10) * 0.008;
    return Math.min(0.22, 0.122 + (d - 20) * 0.004);
}

/**
 * @param {number} difficulty
 * @param {number} unit [0,1)
 */
export function shouldSpawnElite(difficulty, unit) {
    return unit < getEliteSpawnChance(difficulty);
}

/**
 * @param {number} seed
 * @returns {EliteType}
 */
export function pickEliteType(seed) {
    const u = mobSeededUnit((seed ^ 0x51a7e11e) | 0);
    return ELITE_TYPES[Math.floor(u * ELITE_TYPES.length)] ?? 'burn';
}

/**
 * @param {object} mob
 * @param {number} damage
 * @param {string} source
 */
export function damagePlayerFromMob(mob, damage, source) {
    useGameStore.getState().damagePlayer(damage, source);
    if (mob?.isElite && mob.eliteType) {
        applyEliteHitDebuff(mob.eliteType);
    }
}

/**
 * @param {object} mob
 * @param {EliteType} eliteType
 */
export function applyEliteStats(mob, eliteType, baseExp, difficulty) {
    mob.isElite = true;
    mob.type = 'elite';
    mob.eliteType = eliteType;

    mob.hp *= ELITE_HP_MULT;
    mob.maxHp *= ELITE_HP_MULT;
    mob.damage = Math.max(1, Math.round(mob.damage * ELITE_COMBAT_MULT));
    mob.speed *= ELITE_COMBAT_MULT;
    mob.attackSpeed *= ELITE_COMBAT_MULT;
    mob.exp = Math.max(1, Math.round(getMobExpReward(difficulty, baseExp) * 4));
    mob.lootMultiplier = (mob.lootMultiplier ?? 1) * 1.35;
}

/**
 * @param {object} mob
 * @param {EliteType} eliteType
 */
export function attachEliteAura(mob, eliteType) {
    if (!mob?.bodyC) return;

    removeMobGroundShadow(mob);

    const rarityName = ELITE_AURA_RARITY[eliteType] ?? 'Epic';
    const cfg = LOOT_BEAM_BY_RARITY[rarityName];
    if (!cfg) return;

    const root = new Container();
    root.zIndex = 1;
    root.eventMode = 'none';

    const glows = [];
    const spriteGlow = VFX.addGlow(0, 0, {
        color: cfg.color,
        alpha: Math.min(0.78, cfg.alpha * 1.35),
        scale: ELITE_SPRITE_GLOW_SCALE,
    }, root);
    if (spriteGlow) {
        spriteGlow._baseAlpha = spriteGlow.alpha;
        glows.push(spriteGlow);
    }

    const outerGlow = VFX.addGlow(0, 0, {
        color: cfg.color,
        alpha: Math.min(0.35, cfg.alpha * 0.55),
        scale: ELITE_SPRITE_GLOW_SCALE * 1.45,
    }, root);
    if (outerGlow) {
        outerGlow._baseAlpha = outerGlow.alpha;
        glows.push(outerGlow);
    }

    mob.bodyC.addChildAt(root, 0);

    mob.eliteAura = {
        root,
        glows,
        cfg,
        phase: mobSeededUnit((mob.spawnRngSeed ?? 0) ^ 0x0a0a) * Math.PI * 2,
        color: ELITE_AURA_COLORS[eliteType] ?? 0x9b59b6,
    };
}

/** @param {object} mob */
export function updateEliteAura(mob, dt = 1 / 60) {
    const aura = mob?.eliteAura;
    if (!aura?.glows?.length) return;

    aura.phase += dt * 4;
    const pulse = 0.85 + Math.sin(aura.phase) * 0.15;

    for (const glow of aura.glows ?? []) {
        if (glow._baseAlpha != null) {
            glow.alpha = glow._baseAlpha * pulse;
        }
    }
}

/** @param {object} mob */
export function destroyEliteAura(mob) {
    const aura = mob?.eliteAura;
    if (!aura) return;

    if (aura.glows?.length) {
        for (const glow of aura.glows) {
            if (glow) VFX.removeAttached(glow);
        }
    }

    if (aura.root && !aura.root.destroyed) {
        aura.root.destroy({ children: true });
    }

    mob.eliteAura = null;
}
