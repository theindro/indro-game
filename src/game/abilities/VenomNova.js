import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';
import { applyStatusEffect, createPoisonEffect } from '../statusEffects.js';
import { applyMobCombatAggro } from '../combat/combatAggro.js';

/** Ground poison burst unlocked via skill tree (key 5). */
export function useVenomNova(ctx, targetX, targetY) {
    const { openWorld, entities } = ctx;
    const store = useGameStore.getState();
    const ability = store.abilities.ability5;
    if (!ability) return false;

    const now = performance.now();
    if (now < ability.cooldownEnd) return false;

    const { x: px, y: py } = store.player.location;
    const stats = store.player.stats;

    store.useAbility(5, now);

    const radius = ability.explosionRadius ?? 140;
    const poisonDmg = ability.poisonDamage ?? 3;
    const duration = ability.poisonDuration ?? 5;
    const baseDamage = stats.damage * (ability.damageMultiplier ?? 1.2);

    VFX.burst(targetX, targetY, 0x44ff44, 22, 5);
    VFX.addFloat('Venom Nova', targetX, targetY - 40, '#88ff88');

    for (const mob of entities.mobs) {
        if (!mob?.c || mob.hp <= 0) continue;
        const dist = Math.hypot(mob.x - targetX, mob.y - targetY);
        if (dist > radius) continue;

        const falloff = 1 - dist / radius * 0.35;
        mob.hp -= Math.floor(baseDamage * falloff);
        applyMobCombatAggro(mob);
        applyStatusEffect(mob, createPoisonEffect(duration, poisonDmg, 0.8));

        if (mob.hp <= 0) {
            openWorld.killMob?.(mob, entities.mobs.indexOf(mob));
        }
    }

    return true;
}
