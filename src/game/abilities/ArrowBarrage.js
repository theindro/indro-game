// abilities/ArrowBarrage.js
import { createArrow } from '../controllers/createProjectileController.js';
import { DEFAULT_ATTACK_RANGE } from '../constants.js';
import { useGameStore } from "../../stores/gameStore.js";
import { getEmpoweredArrowType } from './empowerBuff.js';

export function useArrowBarrage(ctx, targetX, targetY) {
    const { arrows, openWorld } = ctx;
    const store = useGameStore.getState();
    const stats = store.player.stats;
    const ability = store.abilities.ability1;
    const {x: px, y: py} = store.player.location;
    const now = performance.now();

    if (now < ability.cooldownEnd) {
        console.log(`⏱️ Arrow Barrage on cooldown!`);
        return false;
    }

    store.useAbility(1, now);

    const arrowCount = ability.arrowCount + Math.floor(ability.level / 2);
    const spread = ability.arrowSpread - (ability.level * 0.02);
    const damageMult = ability.damageMultiplier + (ability.level * 0.05);

    const angleToTarget = Math.atan2(targetY - py, targetX - px);

    for (let i = 0; i < arrowCount; i++) {
        const spreadOffset = (i - (arrowCount - 1) / 2) * spread;
        const randomOffset = (Math.random() - 0.5) * 0.1;
        const angle = angleToTarget + spreadOffset + randomOffset;

        const chainData = {
            chainRemaining: 0,
            chainHitMobs: new Set(),
            damage: stats.damage * damageMult,
            isBarrageArrow: true
        };

        const startX = px + (Math.random() - 0.5) * 20;
        const startY = py + (Math.random() - 0.5) * 20;
        const aimX = startX + Math.cos(angle) * 120;
        const aimY = startY + Math.sin(angle) * 120;

        const trajectory = {
            maxRange: stats.attackRange ?? DEFAULT_ATTACK_RANGE,
            speedScale: (stats.projectileSpeed ?? 1) * 1.05,
        };

        const arrow = createArrow(openWorld.entityLayer, startX, startY, aimX, aimY, 0, chainData, getEmpoweredArrowType(), trajectory);

        arrows.push(arrow);
    }

    return true;
}