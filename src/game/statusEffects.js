import {Graphics} from "pixi.js";

export const STATUS_TYPES = {
    NORMAL: 'normal',
    BURN: 'burn',
    POISON: 'poison',
    FREEZE: 'freeze',
    BLEED: 'bleed',
    SLOW: 'slow',
    STUN: 'stun',
};

export const STATUS_COLORS_RGBA = {
    normal: 'rgba(255, 255, 255, 1)',
    burn: 'rgba(204, 51, 51, 1)',
    poison: 'rgba(68, 255, 68, 1)',
    freeze: 'rgb(0,89,255)',
    bleed: 'rgba(204, 51, 51, 1)',
    slow: 'rgba(170, 170, 255, 1)'
};


export function applyStatusEffect(target, effect) {
    if (!target.statusEffects) target.statusEffects = [];

    const now = performance.now();

    // Refresh same effect instead of stacking (you can change later)
    const existing = target.statusEffects.find(e => e.type === effect.type);

    if (existing) {
        existing.duration = effect.duration;
        existing.tickDamage = effect.tickDamage ?? existing.tickDamage;
        existing.slow = effect.slow ?? existing.slow;
        existing.lastTick = now;
        // Reset applied flag so onApply runs again
        existing._applied = false;
        // Update callback functions
        if (effect.onApply) existing.onApply = effect.onApply;
        if (effect.onUpdate) existing.onUpdate = effect.onUpdate;
        if (effect.onRemove) existing.onRemove = effect.onRemove;
        return;
    }

    target.statusEffects.push({
        type: effect.type,
        duration: effect.duration, // seconds
        tickInterval: effect.tickInterval ?? 0.5, // seconds (NOT ms anymore)
        tickDamage: effect.tickDamage ?? 0,
        slow: effect.slow ?? 0,
        lastTick: 0,
        onApply: effect.onApply,
        onUpdate: effect.onUpdate,
        onRemove: effect.onRemove
    });
}

/**
 * @param {object} target Mob or boss
 * @param {number} deltaTime Seconds
 * @param {number} now performance.now()
 * @param {(damage: number, type: string) => void} [onDamage]
 * @returns {boolean} True if HP reached 0 this tick (lethal DoT / effect)
 */
export function updateStatusEffects(target, deltaTime, now, onDamage) {
    if (!target.statusEffects?.length) return false;

    let totalSlow = 0;
    let lethal = false;

    const dt = deltaTime; // seconds per frame

    for (let i = target.statusEffects.length - 1; i >= 0; i--) {
        const effect = target.statusEffects[i];

        if (!effect._applied) {
            effect._applied = true;
            effect.lastTick = 0;
            effect.onApply?.(target);
        }

        effect.onUpdate?.(target, dt);

        // ✅ tick system (SECONDS BASED)
        effect.lastTick += dt;

        if (effect.tickDamage > 0 && effect.lastTick >= effect.tickInterval) {
            effect.lastTick = 0;
            target.hp -= effect.tickDamage;
            onDamage?.(effect.tickDamage, effect.type);
            if (target.hp <= 0) {
                target.hp = 0;
                lethal = true;
            }
        }

        // ✅ duration (SECONDS BASED)
        effect.duration -= dt;

        if (effect.slow) totalSlow += effect.slow;

        if (effect.duration <= 0) {
            effect.onRemove?.(target);
            target.statusEffects.splice(i, 1);
        }
    }

    target.statusSlow = Math.min(totalSlow, 0.9);

    if (!lethal && target.hp <= 0) {
        target.hp = 0;
        lethal = true;
    }

    return lethal;
}

/** Full movement lock for `duration` seconds (mobs check `isStunned`). */
export function createStunEffect(duration) {
    return {
        type: STATUS_TYPES.STUN,
        duration,
        tickDamage: 0,
        slow: 0,

        onApply: (target) => {
            target.isStunned = true;
        },

        onUpdate: (target) => {
            if (!target.stunGraphics && target.c) {
                const g = new Graphics();
                target.stunGraphics = g;
                target.c.addChild(g);
            }
            const g = target.stunGraphics;
            if (!g) return;
            g.clear();
            const r = target.size ?? 14;
            const spin = performance.now() * 0.005;
            g.circle(0, -r * 0.5, 4 + Math.sin(spin) * 1.5).fill({ color: 0xffee88, alpha: 0.9 });
            g.circle(-r * 0.55, 0, 3).fill({ color: 0xffee88, alpha: 0.85 });
            g.circle(r * 0.55, 0, 3).fill({ color: 0xffee88, alpha: 0.85 });
            g.circle(0, 0, r).stroke({ color: 0xffee88, width: 2, alpha: 0.7 });
        },

        onRemove: (target) => {
            target.isStunned = false;
            if (target.stunGraphics) {
                try {
                    target.c?.removeChild(target.stunGraphics);
                } catch {
                    /* destroyed */
                }
                target.stunGraphics.destroy();
                target.stunGraphics = null;
            }
        },
    };
}

export function createFreezeEffect(duration, slow) {
    return {
        type: STATUS_TYPES.FREEZE,
        duration,
        slow,

        onApply: (target) => {
            // visuals
            if (!target.freezeGraphics) {
                const g = new Graphics();
                target.c.addChild(g);
                target.freezeGraphics = g;
            }
        },

        onUpdate: (target) => {
            if (!target.freezeGraphics) return;

            const g = target.freezeGraphics;
            g.clear();

            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = target.size;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                g.moveTo(x, y);
                g.lineTo(x + 4, y + 8);
                g.lineTo(x - 4, y + 8);
                g.closePath();
                g.fill({ color: 0x88ccff, alpha: 0.6 });
            }

            g.circle(0, 0, target.size).stroke({ color: 0xaaddff, alpha: 0.8, width: 2 });
            g.circle(0, 0, target.size - 3).fill({ color: 0x88ccff, alpha: 0.2 });
        },

        onRemove: (target) => {
            target.isFrozen = false;
            target.statusSlow  = 0;

            if (target.freezeGraphics) {
                if (target.c && !target.c.destroyed) {
                    try {
                        target.c.removeChild(target.freezeGraphics);
                    } catch (e) {}
                }

                target.freezeGraphics.destroy();
                target.freezeGraphics = null;
            }
        }
    };
}

export function createBurnEffect(duration, tickDamage, tickInterval = 0.5) {
    return {
        type: STATUS_TYPES.BURN,
        duration,
        tickDamage,
        tickInterval,
        slow: 0, // No slow effect

        onApply: (target) => {
            // Create burn visual overlay
            if (!target.burnGraphics) {
                const g = new Graphics();
                target.c.addChild(g);
                target.burnGraphics = g;
            }
        },

        onUpdate: (target, deltaTime) => {
            if (!target.burnGraphics) return;

            const g = target.burnGraphics;
            g.clear();

            const time = Date.now() / 280;
            const radius = (target.radius || target.size || 15) + 4;
            const pulse = 0.75 + Math.sin(time * 8) * 0.25;

            g.ellipse(0, 2, radius * 1.1, radius * 0.55)
                .fill({ color: 0xff4400, alpha: 0.1 * pulse });

            g.ellipse(0, 0, radius * 0.75, radius * 0.38)
                .fill({ color: 0xff6622, alpha: 0.14 * pulse });

            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + time * 1.4;
                const dist = radius * 0.55 + Math.sin(time * 3 + i) * 2;
                const fx = Math.cos(angle) * dist;
                const fy = Math.sin(angle) * dist * 0.5 - 4;

                g.moveTo(fx, fy + 2);
                g.lineTo(fx, fy - 5 - Math.sin(time * 4 + i));
                g.stroke({ color: 0xffaa44, width: 1.8, alpha: 0.45 * pulse, cap: 'round' });
            }
        },

        onRemove: (target) => {
            // Remove burn graphics
            if (target.burnGraphics) {
                if (target.c && !target.c.destroyed) {
                    try {
                        target.c.removeChild(target.burnGraphics);
                    } catch (e) {}
                }
                target.burnGraphics.destroy();
                target.burnGraphics = null;
            }
        }
    };
}

export function createPoisonEffect(duration, tickDamage, tickInterval = 1) {
    return {
        type: STATUS_TYPES.POISON,
        duration,
        tickDamage,
        tickInterval,
        slow: 0.1, // 10% slow from poison

        onApply: (target) => {
            console.log(`💚 Poison applied to ${target.archetype || 'boss'} for ${duration}ms, dealing ${tickDamage} damage every ${tickInterval}ms`);

            // Create poison visual effect
            if (!target.poisonGraphics) {
                const g = new Graphics();
                target.c.addChild(g);
                target.poisonGraphics = g;
            }

            // Add subtle green tint to mob
            if (target.body && !target._originalTint) {
                target._originalTint = target.body.tint || 0xffffff;
                target.body.tint = 0x88ff88;
            }
        },

        onUpdate: (target, deltaTime) => {
            if (!target.poisonGraphics) return;

            const g = target.poisonGraphics;
            g.clear();

            const time = Date.now() / 200;
            const radius = (target.size || 15) + 8;

            // Poison bubbles/droplets
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 + time;
                const radiusOffset = Math.sin(time * 1.5 + i) * 4;
                const x = Math.cos(angle) * (radius + radiusOffset);
                const y = Math.sin(angle) * (radius + radiusOffset);

                // Bubbles
                g.circle(x, y, 3).fill({ color: 0x88ff88, alpha: 0.4 });
                g.circle(x - 1, y - 1, 1).fill({ color: 0xccffcc, alpha: 0.6 });
            }

            // Floating particles
            for (let i = 0; i < 8; i++) {
                const px = Math.sin(time * 2 + i) * (radius - 5);
                const py = Math.cos(time * 1.7 + i) * (radius - 8) - 5;
                g.circle(px, py, 2).fill({ color: 0xaaffaa, alpha: 0.5 });
            }

            // Poison cloud glow
            g.circle(0, 0, radius - 3).fill({ color: 0x44ff44, alpha: 0.1 });

            // Pulsing effect
            const pulse = Math.sin(time * 5) * 0.1 + 0.15;
            g.circle(0, 0, radius).fill({ color: 0x88ff88, alpha: pulse });
        },

        onRemove: (target) => {
            console.log(`💚 Poison removed from ${target.archetype || 'boss'}`);

            // Remove poison graphics
            if (target.poisonGraphics) {
                if (target.c && !target.c.destroyed) {
                    try {
                        target.c.removeChild(target.poisonGraphics);
                    } catch (e) {}
                }
                target.poisonGraphics.destroy();
                target.poisonGraphics = null;
            }

            // Restore original tint
            if (target.body && target._originalTint) {
                target.body.tint = target._originalTint;
                target._originalTint = null;
            }
        }
    };
}