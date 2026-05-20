/**
 * Debuffs applied to the player (elite mob melee / contact attacks).
 */

import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';

/** @typedef {{ type: string, duration: number, tickDamage?: number, tickInterval?: number, slow?: number, tickAcc?: number }} PlayerDebuff */

/** @type {PlayerDebuff[]} */
let active = [];

const DEBUFF_DEF = {
    burn: { duration: 3.2, tickDamage: 3, tickInterval: 0.55 },
    poison: { duration: 4.5, tickDamage: 2, tickInterval: 0.65 },
    freeze: { duration: 1.8, slow: 0.42, tickDamage: 0 },
};

/**
 * @param {'burn'|'poison'|'freeze'} eliteType
 */
export function applyEliteHitDebuff(eliteType) {
    const def = DEBUFF_DEF[eliteType];
    if (!def) return;

    const existing = active.find((d) => d.type === eliteType);
    if (existing) {
        existing.duration = def.duration;
        existing.tickAcc = 0;
        return;
    }

    active.push({
        type: eliteType,
        duration: def.duration,
        tickDamage: def.tickDamage,
        tickInterval: def.tickInterval,
        slow: def.slow,
        tickAcc: 0,
    });
}

/** @returns {number} Move speed multiplier (0–1]. */
export function getPlayerDebuffMoveMul() {
    let slow = 0;
    for (const d of active) {
        if (d.type === 'freeze' && d.slow) {
            slow = Math.max(slow, d.slow);
        }
    }
    return Math.max(0.35, 1 - slow);
}

/**
 * @param {number} dt Seconds
 * @param {{ x: number, y: number }} [playerLoc] For floating combat text
 */
export function tickPlayerDebuffs(dt, playerLoc) {
    if (!active.length) return;

    const store = useGameStore.getState();
    const px = playerLoc?.x ?? store.player?.location?.x ?? 0;
    const py = playerLoc?.y ?? store.player?.location?.y ?? 0;

    for (let i = active.length - 1; i >= 0; i--) {
        const d = active[i];
        d.duration -= dt;

        if (d.tickDamage > 0 && d.tickInterval > 0) {
            d.tickAcc = (d.tickAcc ?? 0) + dt;
            if (d.tickAcc >= d.tickInterval) {
                d.tickAcc = 0;
                store.damagePlayer(d.tickDamage, `elite ${d.type}`);
                if (d.type === 'burn') {
                    VFX.addFloat(`🔥 ${d.tickDamage}`, px, py - 28, '#ff8844', { opacity: 0.85 });
                } else if (d.type === 'poison') {
                    VFX.addFloat(`💚 ${d.tickDamage}`, px, py - 28, '#66ff88', { opacity: 0.85 });
                }
            }
        }

        if (d.duration <= 0) {
            active.splice(i, 1);
        }
    }
}

export function clearPlayerDebuffs() {
    active = [];
}
