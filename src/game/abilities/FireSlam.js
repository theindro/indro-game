import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';
import { applyStatusEffect, createStunEffect, createBurnEffect } from '../statusEffects.js';
import { applyMobCombatAggro, applyBossCombatAggro } from '../combat/combatAggro.js';
import { resolveFireSlamLanding } from './abilityTargeting.js';
import {
    spawnFireSlamGroundAttack,
    spawnFireShockwaveAndScorch,
} from './fireSlamVfx.js';

/**
 * @param {object} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} baseDamage
 * @param {number} radius
 * @param {number} stunDuration
 * @param {number} burnDuration
 * @param {number} burnTick
 */
function applyFireSlamDamage(ctx, x, y, baseDamage, radius, stunDuration, burnDuration, burnTick) {
    const { openWorld, entities } = ctx;

    for (const mob of entities.mobs ?? []) {
        if (!mob?.c || mob.hp <= 0) continue;
        const d = Math.hypot(mob.x - x, mob.y - y);
        if (d > radius) continue;

        const falloff = 1 - (d / radius) * 0.35;
        const dmg = Math.floor(baseDamage * falloff);
        mob.hp -= dmg;
        applyMobCombatAggro(mob);
        applyStatusEffect(mob, createStunEffect(stunDuration));
        applyStatusEffect(mob, createBurnEffect(burnDuration, burnTick, 0.5));

        if (dmg > 0) {
            VFX.burst(mob.x, mob.y, 0xff8800);
        }

        if (mob.hp <= 0) {
            openWorld.killMob?.(mob, entities.mobs.indexOf(mob));
        }
    }

    for (const boss of entities.bosses ?? []) {
        if (!boss?.c || boss.hp <= 0 || boss.dead) continue;
        const d = Math.hypot(boss.x - x, boss.y - y);
        if (d > radius) continue;

        boss.hp -= Math.floor(baseDamage * 0.7);
        applyBossCombatAggro(boss);
        applyStatusEffect(boss, createStunEffect(stunDuration * 0.5));
        applyStatusEffect(boss, createBurnEffect(burnDuration * 0.6, burnTick, 0.6));
        VFX.burst(boss.x, boss.y, 0xff6600);
    }
}

/**
 * @param {object} ctx
 * @param {number} x
 * @param {number} y
 */
export function executeFireSlamImpact(ctx, x, y) {
    const { openWorld } = ctx;
    const store = useGameStore.getState();
    const ability = store.abilities.ability7;
    if (!ability) return;

    const stats = store.player.stats;
    const radius = ability.explosionRadius ?? 140;
    const stunDuration = ability.stunDuration ?? 2;
    const burnDuration = ability.burnDuration ?? 3;
    const burnTick = ability.burnTickDamage ?? 3;
    const baseDamage = stats.damage * (ability.damageMultiplier ?? 1.45);

    const layer = openWorld?.entityLayer;
    if (!layer) return;

    VFX.shake(16);

    spawnFireShockwaveAndScorch(layer, x, y, radius);

    let damaged = false;
    spawnFireSlamGroundAttack(layer, x, y, radius, () => {
        if (damaged) return;
        damaged = true;
        applyFireSlamDamage(ctx, x, y, baseDamage, radius, stunDuration, burnDuration, burnTick);
    });
}

/** Teleport to cursor, then fire slam shockwave + ground attack on landing. */
export function useFireSlam(ctx, targetX, targetY) {
    const { openWorld, colliders } = ctx;
    const store = useGameStore.getState();
    const ability = store.abilities.ability7;
    if (!ability) return false;

    const now = performance.now();
    if (now < ability.cooldownEnd) return false;
    if (!store.skillUnlocks?.ability7) return false;

    const { x: px, y: py } = store.player.location;
    const maxRange = ability.leapRange ?? 420;

    const { x: landX, y: landY } = resolveFireSlamLanding(
        px,
        py,
        targetX,
        targetY,
        maxRange,
        openWorld,
        colliders
    );

    if (!store.useAbilityByKey('ability7', now)) return false;

    store.queuePlayerTeleport(landX, landY);
    store.setPendingFireSlam(landX, landY);

    return true;
}
