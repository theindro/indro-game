import {useGameStore} from "../../../stores/gameStore.js";
import {GroundAttackController} from '../createGroundAttackController.js'; // Adjust path as needed

export class TankArchetype {
    constructor(mob, entityLayer) {
        this.mob = mob;
        this.groundSlamCooldown = 0;
        this.slamRadius = 200;

        // Initialize ground attack manager for this mob
        this.groundAttacks = new GroundAttackController(entityLayer, mob);
    }

    update(entityLayer) {
        const { px, py, dt } = entityLayer;
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

        // Ground slam attack (using cooldown in seconds)
        if (this.groundSlamCooldown <= 0 && distToPlayer < this.slamRadius + 20) {
            this.performGroundSlam(entityLayer);
            this.groundSlamCooldown = 2.0; // 2 seconds (not frames)
        }

        if (this.groundSlamCooldown > 0) {
            this.groundSlamCooldown -= dt;
        }

        // Update ground attacks
        if (this.groundAttacks) {
            this.groundAttacks.update(px, py, (damage) => {
                // Damage player when ground attack hits
                useGameStore.getState().damagePlayer(damage, 'tank slam');

                // Knockback effect
                const angle = Math.atan2(py - m.y, px - m.x);
                const knockback = { x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 };
                if (entityLayer.applyKnockback) entityLayer.applyKnockback(knockback);
            });
        }

        // Visual: size pulsing when angry
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.03;
        m.c.scale.set(pulse, pulse);

        return { moveX, moveY, attackOverride: false };
    }

    performGroundSlam(entityLayer) {
        const { px, py } = entityLayer;
        const m = this.mob;

        // Create ground slam effect using GroundAttackController
        this.groundAttacks.addAttack(m.x, m.y, {
            shape: 'circle',
            color: 0xff8844,
            warningColor: 0xff4400,
            innerColor: 0xffaa66,
            radius: this.slamRadius,
            warningDuration: 300, // frames (~0.5 seconds at 60fps)
            damage: 25,
            trackPlayer: false, // Tank slam is centered on tank, doesn't track player
            onHit: (hitX, hitY) => {
                console.log('slam hit palyer');
                // Optional: add hit effect
            },
            onComplete: () => {
                // Optional: effect when slam finishes
            }
        });

        // Screen shake

        // Floating text
    }

    onDamage(amount, source) {
        // Tanks take reduced damage from front
        const isRanged = source === 'ranged';
        return {
            damageMult: isRanged ? 0.7 : 1.0,
            knockbackMult: 0.3
        };
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        if (this.groundAttacks) {
            this.groundAttacks.clear();
            this.groundAttacks = null;
        }
    }
}