import {Graphics} from "pixi.js";

export const STATUS_TYPES = {
    BURN: 'burn',
    POISON: 'poison',
    FREEZE: 'freeze',
    BLEED: 'bleed',
    SLOW: 'slow'
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
        duration: effect.duration,
        tickInterval: effect.tickInterval ?? 500,
        tickDamage: effect.tickDamage ?? 0,
        slow: effect.slow ?? 0,
        lastTick: now,
        onApply: effect.onApply,
        onUpdate: effect.onUpdate,
        onRemove: effect.onRemove
    });
}

export function updateStatusEffects(target, deltaTime, now, onDamage) {
    if (!target.statusEffects || target.statusEffects.length === 0) return;

    let totalSlow = 0;
    target.isFrozen = false;

    for (let i = target.statusEffects.length - 1; i >= 0; i--) {
        const effect = target.statusEffects[i];

        // APPLY (first frame)
        if (!effect._applied) {
            effect._applied = true;
            if (effect.onApply) effect.onApply(target);
        }

        // UPDATE
        if (effect.onUpdate) {
            effect.onUpdate(target, deltaTime);
        }

        // DOT - Use milliseconds
        if (effect.tickDamage > 0 && now - effect.lastTick >= effect.tickInterval) {
            effect.lastTick = now;
            target.hp -= effect.tickDamage;
            if (onDamage) onDamage(effect.tickDamage, effect.type);
        }

        // ⭐ FIX: Convert deltaTime to milliseconds if it's frame-based
        // Assuming deltaTime is frames (1 per frame at 60fps ≈ 16.67ms)
        const deltaMs = deltaTime * 16.67; // Convert frames to milliseconds

        effect.duration -= deltaMs;

        // Slow stacking
        if (effect.slow) {
            totalSlow += effect.slow;
        }

        // REMOVE
        if (effect.duration <= 0) {
            if (effect.onRemove) effect.onRemove(target);
            target.statusEffects.splice(i, 1);
            totalSlow = 0;
        }
    }

    // Apply movement modifiers
    target.statusSlow = Math.min(totalSlow, 0.9);
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
                const radius = 18;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                g.moveTo(x, y);
                g.lineTo(x + 4, y + 8);
                g.lineTo(x - 4, y + 8);
                g.closePath();
                g.fill({ color: 0x88ccff, alpha: 0.6 });
            }

            g.circle(0, 0, 15).stroke({ color: 0xaaddff, alpha: 0.8, width: 2 });
            g.circle(0, 0, 12).fill({ color: 0x88ccff, alpha: 0.2 });
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

export function createBurnEffect(duration, tickDamage, tickInterval = 500) {
    return {
        type: STATUS_TYPES.BURN,
        duration,
        tickDamage,
        tickInterval,
        slow: 0, // No slow effect

        onApply: (target) => {
            console.log(`🔥 Burn applied to ${target.archetype || 'boss'} for ${duration}ms, dealing ${tickDamage} damage every ${tickInterval}ms`);

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

            // Animated fire particles
            const time = Date.now() / 100;
            const radius = (target.size || 15) + 5;

            // Flickering flame effect
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + time;
                const offset = Math.sin(time * 2 + i) * 3;
                const x = Math.cos(angle) * (radius - 2 + offset);
                const y = Math.sin(angle) * (radius - 2 + offset) - 5;

                // Flame shape
                g.moveTo(x, y);
                g.lineTo(x - 4, y - 8);
                g.lineTo(x, y - 12);
                g.lineTo(x + 4, y - 8);
                g.closePath();
                g.fill({ color: 0xff4400, alpha: 0.7 });

                // Inner flame
                g.moveTo(x, y - 2);
                g.lineTo(x - 2, y - 6);
                g.lineTo(x, y - 9);
                g.lineTo(x + 2, y - 6);
                g.closePath();
                g.fill({ color: 0xffaa00, alpha: 0.8 });
            }

            // Fire glow
            g.circle(0, 0, radius).fill({ color: 0xff4400, alpha: 0.15 });

            // Pulse the mob's body color
            if (target.body && target._originalBodyColor) {
                const pulse = Math.sin(time * 10) * 0.3 + 0.7;
                target.body.clear();
                // You'll need to recreate the body with the tinted color
                // This is a simplified version - adjust based on your mob rendering
                if (target.body.circle) {
                    target.body.circle(0, 0, target.radius || 15).fill({
                        color: 0xff6600,
                        alpha: pulse * 0.5
                    });
                }
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

            // Restore original body color
            if (target.body && target._originalBodyColor) {
                target.body.clear();
                // Recreate original body - you may need to call the original creation function
                // For now, just log that it needs restoration
                console.log('Body color restoration needed');
                target._originalBodyColor = null;
            }
        }
    };
}

export function createPoisonEffect(duration, tickDamage, tickInterval = 1000) {
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
            const radius = (target.radius || 15) + 8;

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