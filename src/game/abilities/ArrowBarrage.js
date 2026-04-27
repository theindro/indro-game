// abilities/ArrowBarrage.js
import { createArrow, ARROW_TYPES } from '../controllers/createProjectileController.js';
import {useGameStore} from "../../stores/gameStore.js";
import {VFX} from "../GlobalEffects.js";

export function useArrowBarrage(ctx, targetX, targetY) {
    const { arrows, openWorld } = ctx;
    const store = useGameStore.getState();
    const stats = store.player.stats;
    const ability = store.abilities.ability1;
    const {x: px, y: py} = store.player;
    const now = performance.now();

    if (now < ability.cooldownEnd) {
        console.log(`⏱️ Arrow Barrage on cooldown!`);
        return false;
    }

    store.useAbility(1, now);

    const arrowCount = ability.arrowCount + Math.floor(ability.level / 2);
    const spread = ability.arrowSpread - (ability.level * 0.02);
    const damageMult = ability.damageMultiplier + (ability.level * 0.05);

    VFX.burst(px, py, 0x88aaff, 20, 3);

    const angleToTarget = Math.atan2(targetY - py, targetX - px);

    for (let i = 0; i < arrowCount; i++) {
        const spreadOffset = (i - (arrowCount - 1) / 2) * spread;
        const randomOffset = (Math.random() - 0.5) * 0.1;
        const angle = angleToTarget + spreadOffset + randomOffset;
        const speed = 6;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const chainData = {
            chainRemaining: 0,
            chainHitMobs: new Set(),
            damage: stats.damage * damageMult,
            isBarrageArrow: true
        };

        const startX = px + (Math.random() - 0.5) * 20;
        const startY = py + (Math.random() - 0.5) * 20;

        const arrow = createArrow(openWorld.entityLayer, startX, startY, startX + vx * 10, startY + vy * 10, 0, chainData, ARROW_TYPES.BURN);
        arrow.vx = vx;
        arrow.vy = vy;
        arrow.life = 120;

        arrows.push(arrow);
    }

    return true;
}