import {useGameStore} from "../../stores/gameStore.js";
import { createArrow } from "../controllers/createProjectileController.js";
import { getEmpoweredArrowType } from "./empowerBuff.js";
import {DEFAULT_ATTACK_RANGE} from "../constants.js";
import {VFX} from "../GlobalEffects.js";
import {STATUS_COLORS_RGBA} from "../statusEffects.js";

export function useRapidFire(ctx, targetX, targetY) {
    const { arrows, openWorld } = ctx;
    const store = useGameStore.getState();
    const stats = store.player.stats;
    const ability = store.abilities.ability2;

    const now = performance.now();

    // ✅ Check cooldown using time
    if (now < ability.cooldownEnd) {
        console.log(`⏱️ Rapid Fire on cooldown!`);
        return false;
    }

    // Use the ability (sets cooldown)
    store.useAbility(2, now);

    // Calculate arrow parameters
    const arrowCount = ability.arrowCount + Math.floor(ability.level / 2);
    const damageMult = ability.damageMultiplier + (ability.level * 0.05);
    const fireDelaySec = ability.fireDelay ?? 0.1;

    // Track how many arrows have been fired
    let arrowsFired = 0;

    // Create arrows with delay between them
    function fireNextArrow() {
        if (arrowsFired >= arrowCount) return;

        const live = useGameStore.getState();
        if (live.gameState?.dead || live.gameState?.paused) return;

        const { x: px, y: py } = live.player.location;
        const angleToTarget = Math.atan2(targetY - py, targetX - px);

        if (arrowsFired === 0) {
            VFX.burst(px, py, STATUS_COLORS_RGBA.poison);
        }

        // Small random spread for rapid fire (less accurate than barrage)
        const spread = 0.08;
        const randomOffset = (Math.random() - 0.5) * spread;
        const angle = angleToTarget + randomOffset;

        const chainData = {
            chainRemaining: 0,
            chainHitMobs: new Set(),
            damage: stats.damage * damageMult,
            isRapidFireArrow: true
        };

        // Spawn from current player position (updates if you move during the volley)
        const startX = px + Math.cos(angleToTarget) * 20 + (Math.random() - 0.5) * 15;
        const startY = py + Math.sin(angleToTarget) * 20 + (Math.random() - 0.5) * 15;
        const aimX = startX + Math.cos(angle) * 120;
        const aimY = startY + Math.sin(angle) * 120;

        const trajectory = {
            maxRange: stats.attackRange ?? DEFAULT_ATTACK_RANGE,
            speedScale: (stats.projectileSpeed ?? 1) * 0.98,
        };

        const arrow = createArrow(openWorld.entityLayer, startX, startY, aimX, aimY, 0, chainData, getEmpoweredArrowType(), trajectory);

        arrows.push(arrow);

        arrowsFired++;

        setTimeout(fireNextArrow, fireDelaySec * 1000);
    }

    // Start firing
    fireNextArrow();

    return true;
}
