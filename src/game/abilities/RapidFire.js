import {useGameStore} from "../../stores/gameStore.js";
import {ARROW_TYPES, createArrow} from "../controllers/createProjectileController.js";
import {VFX} from "../GlobalEffects.js";

export function useRapidFire(ctx, targetX, targetY) {
    const { world, arrows, openWorld} = ctx;
    const store = useGameStore.getState();
    const stats = store.player.stats;
    const ability = store.abilities.ability2;
    const {x: px, y: py} = store.player;

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
    const fireDelay = ability.fireDelay || 3; // Frames between shots (3 frames = 20 shots per second at 60fps)


    // Visual effect - muzzle flash at player position
    VFX.burst(px, py, 0xffaa44, 5, 2);

    // Calculate angle to target
    const angleToTarget = Math.atan2(targetY - py, targetX - px);

    // Track how many arrows have been fired
    let arrowsFired = 0;

    // Create arrows with delay between them
    function fireNextArrow() {
        if (arrowsFired >= arrowCount) return;

        const i = arrowsFired;

        // Small random spread for rapid fire (less accurate than barrage)
        const spread = 0.08;
        const randomOffset = (Math.random() - 0.5) * spread;
        const angle = angleToTarget + randomOffset;

        // Calculate velocity (slightly faster than normal arrows)
        const speed = 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const chainData = {
            chainRemaining: 0,
            chainHitMobs: new Set(),
            damage: stats.damage * damageMult,
            isRapidFireArrow: true
        };

        // Calculate start position (slightly in front of player)
        const startX = px + Math.cos(angleToTarget) * 20 + (Math.random() - 0.5) * 15;
        const startY = py + Math.sin(angleToTarget) * 20 + (Math.random() - 0.5) * 15;

        const arrow = createArrow(openWorld.entityLayer, startX, startY, startX + vx * 10, startY + vy * 10, 0, chainData, ARROW_TYPES.POISON);
        arrow.vx = vx;
        arrow.vy = vy;
        arrow.life = 100;

        arrows.push(arrow);

        arrowsFired++;

        // Fire next arrow after delay
        setTimeout(() => fireNextArrow(), fireDelay * 16.67); // Convert frames to ms (approx)
    }

    // Start firing
    fireNextArrow();

    return true;
}
