import * as PIXI from 'pixi.js';
import {useGameStore} from "../../../stores/gameStore.js";
import {Graphics} from "pixi.js";

export class TankArchetype {
    constructor(mob, ctx) {
        this.mob = mob;
        this.groundSlamCooldown = 0;
        this.slamRadius = 70;
    }

    update(ctx) {
        const { px, py, shakeRef } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        let moveX = 0, moveY = 0;

        // Slower, deliberate movement
        if (distToPlayer > 30) {
            moveX = (px - m.x) / distToPlayer;
            moveY = (py - m.y) / distToPlayer;
            // 40% of normal speed
            moveX *= m.speed * 0.4;
            moveY *= m.speed * 0.4;
        }

        // Ground slam attack
        if (this.groundSlamCooldown <= 0 && distToPlayer < this.slamRadius + 20) {
            this.performGroundSlam(ctx);
            this.groundSlamCooldown = 120; // 2 seconds
        }

        if (this.groundSlamCooldown > 0) {
            this.groundSlamCooldown--;
        }

        // Visual: size pulsing when angry
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.03;
        m.c.scale.set(pulse, pulse);

        return { moveX, moveY, attackOverride: false };
    }

    performGroundSlam(ctx) {
        const { px, py, shakeRef, floats } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        if (distToPlayer < this.slamRadius) {
            // Damage player
            useGameStore.getState().damagePlayer(4, 'tank slam');

            // Knockback
            const angle = Math.atan2(py - m.y, px - m.x);
            const knockback = { x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 };
            if (ctx.applyKnockback) ctx.applyKnockback(knockback);
        }

        // Screen shake
        if (shakeRef) shakeRef.value = 8;

        // Visual effect
        if (floats) {
            floats.push({
                text: '💥 SLAM!',
                x: m.x,
                y: m.y - 30,
                life: 30
            });
        }

        // Create shockwave ring (visual)
        this.createShockwave(ctx);
    }

    createShockwave(ctx) {
        const { world } = ctx;
        const m = this.mob;

        // Create explosion ring
        const explosionRing = new Graphics();
        explosionRing.circle(0, 0, 10).stroke({ color: 0xaaddff, width: 4, alpha: 0.8 });
        explosionRing.x = m.x;
        explosionRing.y = m.y;
        ctx.openWorld.entityLayer.addChild(explosionRing);

        let scale = 1;

        function animateExplosion() {
            if (explosionRing.destroyed) return;
            scale += 0.15;
            explosionRing.scale.set(scale);
            explosionRing.alpha -= 0.05;
            if (explosionRing.alpha <= 0) {
                ctx.openWorld.entityLayer.removeChild(explosionRing);
                explosionRing.destroy();
            } else {
                requestAnimationFrame(animateExplosion);
            }
        }

        requestAnimationFrame(animateExplosion);

    }

    onDamage(amount, source) {
        // Tanks take reduced damage from front
        const isRanged = source === 'ranged';
        return {
            damageMult: isRanged ? 0.7 : 1.0,
            knockbackMult: 0.3
        };
    }
}