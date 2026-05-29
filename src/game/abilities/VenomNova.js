import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';
import { applyStatusEffect, createPoisonEffect } from '../statusEffects.js';
import { applyMobCombatAggro, applyBossCombatAggro } from '../combat/combatAggro.js';
import { spawnVenomNovaGroundAttack } from './venomNovaVfx.js';

/** Ground poison burst at target location. */
export function useVenomNova(ctx, targetX, targetY) {
    const { openWorld, entities } = ctx;
    const store = useGameStore.getState();
    const ability = store.abilities.ability5;
    if (!ability) return false;

    const now = performance.now();
    if (now < ability.cooldownEnd) return false;

    const stats = store.player.stats;

    store.useAbility(5, now);

    const radius = ability.explosionRadius ?? 140;
    const poisonDmg = ability.poisonDamage ?? 3;
    const duration = ability.poisonDuration ?? 5;
    const baseDamage = stats.damage * (ability.damageMultiplier ?? 1.2);

    const layer = openWorld?.entityLayer;
    if (!layer) return false;

    VFX.shake(10);

    spawnVenomNovaGroundAttack(layer, targetX, targetY, radius, () => {
        for (const mob of entities.mobs ?? []) {
            if (!mob?.c || mob.hp <= 0) continue;
            const dist = Math.hypot(mob.x - targetX, mob.y - targetY);
            if (dist > radius) continue;

            const falloff = 1 - (dist / radius) * 0.35;
            mob.hp -= Math.floor(baseDamage * falloff);
            applyMobCombatAggro(mob);
            applyStatusEffect(mob, createPoisonEffect(duration, poisonDmg, 0.8));
            VFX.burst(mob.x, mob.y, 0x66ff66);

            if (mob.hp <= 0) {
                openWorld.killMob?.(mob, entities.mobs.indexOf(mob));
            }
        }

        for (const boss of entities.bosses ?? []) {
            if (!boss?.c || boss.hp <= 0 || boss.dead) continue;
            const dist = Math.hypot(boss.x - targetX, boss.y - targetY);
            if (dist > radius) continue;

            boss.hp -= Math.floor(baseDamage * 0.65);
            applyBossCombatAggro(boss);
            applyStatusEffect(boss, createPoisonEffect(duration * 0.6, poisonDmg, 0.8));
            VFX.burst(boss.x, boss.y, 0x55ee55);
        }
    });

    return true;
}
