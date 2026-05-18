import {GroundAttackController} from '../createGroundAttackController.js';
import {GROUND_WARN_NORMAL} from '../../constants.js';
import {VFX} from '../../GlobalEffects.js';

export class TankArchetype {
    constructor(mob, entityLayer) {
        this.mob = mob;
        this.slamRadius = 150;

        // random initial offset so they NEVER sync
        this.groundSlamCooldown = Math.random() * 1.0;

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
            moveX *= m.speed;
            moveY *= m.speed;
        }

        // Ground slam attack (using cooldown in seconds)
        if (this.groundSlamCooldown <= 0 && distToPlayer < this.slamRadius + 300) {
            this.performGroundSlam(entityLayer);
            this.groundSlamCooldown = 2.0 + Math.random() * 1.0;
        }

        if (this.groundSlamCooldown > 0) {
            this.groundSlamCooldown -= dt;
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
        this.groundAttacks.addAttack(px, py, {
            shape: 'circle',
            color: '#006dff',
            warningColor: '#ffffff',
            innerColor: '#089bff',
            radius: this.slamRadius,
            warningDuration: GROUND_WARN_NORMAL,
            damage: 25,
            onImpact: (ix, iy) => {
                VFX.playZapImpact(ix, iy, 0.95);
            },
        });

        // Screen shake

        // Floating text
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        if (this.groundAttacks) {
            console.log('checking if ground attacks are cleared')
            this.groundAttacks.clear();
            this.groundAttacks = null;
        }
    }
}