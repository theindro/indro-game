import { createArrow } from '../controllers/createProjectileController.js';
import { DEFAULT_ATTACK_RANGE } from '../constants.js';
import { useGameStore } from '../../stores/gameStore.js';
import { getEmpoweredArrowType } from './empowerBuff.js';
import { VFX } from '../GlobalEffects.js';
import { audioManager } from '../utils/audioManager.js';

/** @type {{ elapsed: number, fireAcc: number, baseAngle: number, ctx: object, waveIndex: number } | null} */
let activeSpin = null;

export function isSpinshotActive() {
    return activeSpin != null;
}

export function cancelSpinshot() {
    activeSpin = null;
}

function fireSpinWave(spin) {
    const store = useGameStore.getState();
    const ability = store.abilities?.ability6;
    if (!ability) return;

    const stats = store.player.stats;
    const { x: px, y: py } = store.player.location;
    const { arrows, openWorld } = spin.ctx;

    const count = Math.max(4, ability.arrowsPerWave ?? 6);
    const damageMult = ability.damageMultiplier ?? 0.5;
    const rotStep = (ability.rotationSpeed ?? 3) * (ability.fireInterval ?? 0.09);

    for (let i = 0; i < count; i++) {
        const angle = spin.baseAngle + (i / count) * Math.PI * 2;
        const aimX = px + Math.cos(angle) * 120;
        const aimY = py + Math.sin(angle) * 120;

        const chainData = {
            chainRemaining: stats.chainEnabled ? stats.chainCount : 0,
            chainHitMobs: new Set(),
            damage: stats.damage * damageMult,
            chainRange: stats.chainRange,
            chainDamageMultiplier: stats.chainDamage,
            isSpinshotArrow: true,
        };

        const arrow = createArrow(
            openWorld.entityLayer,
            px,
            py,
            aimX,
            aimY,
            0,
            chainData,
            getEmpoweredArrowType(),
            {
                maxRange: stats.attackRange ?? DEFAULT_ATTACK_RANGE,
                speedScale: (stats.projectileSpeed ?? 1) * 1.08,
            }
        );

        arrow.pierceRemaining = stats.pierceCount ?? 0;
        arrows.push(arrow);
    }

    spin.baseAngle += rotStep;
    spin.waveIndex += 1;

    if (spin.waveIndex % 3 === 1) {
        VFX.burst(px, py, 0xaa88ff, 6, 2);
    }
}

/**
 * Spin-to-win: fires arrows in a full circle for `spinDuration` seconds (key 6).
 */
export function useSpinshot(ctx) {
    if (activeSpin) return false;

    const store = useGameStore.getState();
    const ability = store.abilities?.ability6;
    if (!ability) return false;

    const now = performance.now();
    if (now < ability.cooldownEnd) return false;

    if (!store.useAbility(6, now)) return false;

    const { x: px, y: py } = store.player.location;
    VFX.burst(px, py, 0xcc99ff, 14, 4);
    VFX.addFloat('Spinshot', px, py - 36, '#d4b8ff');
    audioManager.playSFX('/sounds/arrowshoot.mp3', 0.5);

    activeSpin = {
        elapsed: 0,
        fireAcc: 0,
        baseAngle: Math.random() * Math.PI * 2,
        ctx,
        waveIndex: 0,
    };

    fireSpinWave(activeSpin);
    return true;
}

/** Called from game loop while spin is active. */
export function updateSpinshot(dt) {
    if (!activeSpin) return;

    const store = useGameStore.getState();
    if (store.gameState?.paused || store.gameState?.dead) {
        activeSpin = null;
        return;
    }

    const ability = store.abilities?.ability6;
    if (!ability) {
        activeSpin = null;
        return;
    }

    const duration = ability.spinDuration ?? 2;
    const interval = Math.max(0.05, ability.fireInterval ?? 0.09);

    activeSpin.elapsed += dt;
    activeSpin.fireAcc += dt;

    while (activeSpin.fireAcc >= interval && activeSpin.elapsed < duration) {
        activeSpin.fireAcc -= interval;
        fireSpinWave(activeSpin);
    }

    if (activeSpin.elapsed >= duration) {
        const { x: px, y: py } = store.player.location;
        VFX.burst(px, py, 0x8866cc, 10, 3);
        activeSpin = null;
    }
}
