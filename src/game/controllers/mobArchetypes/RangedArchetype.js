import { createEnemyProj } from "../createProjectileController.js";
import { audioManager } from "../../utils/audioManager.js";

export class RangedArchetype {
    constructor(mob, ctx) {
        this.mob = mob;
        this.shootCooldown = 0;
        this.shootRange = 350;
        this.fleeRange = 150;
        this.projectileType = 'magic';
    }

    update(ctx) {
        const { px, py, dt = 1 } = ctx;           // ← make sure dt is passed
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        let moveX = 0, moveY = 0;

        // === Movement Behavior ===
        if (distToPlayer < this.fleeRange) {
            // Flee from player
            const dirX = (m.x - px) / distToPlayer;
            const dirY = (m.y - py) / distToPlayer;
            moveX = dirX * m.speed * 1.2;
            moveY = dirY * m.speed * 1.2;
        }
        else if (distToPlayer > this.shootRange) {
            // Move closer if too far
            const dirX = (px - m.x) / distToPlayer;
            const dirY = (py - m.y) / distToPlayer;
            moveX = dirX * m.speed * 0.8;
            moveY = dirY * m.speed * 0.8;
        }

        // === Shooting Logic (using attackSpeed) ===
        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        const canShoot = this.shootCooldown <= 0
            && distToPlayer <= this.shootRange
            && distToPlayer >= this.fleeRange;

        if (canShoot) {
            this.shoot(ctx);

            // attackSpeed = attacks per second (e.g. 1.2 = 1.2 shots/sec)
            this.shootCooldown = Math.max(0.25, 1 / m.attackSpeed);
        }

        // === Visual Charge-up Effect ===
        const isCharging = this.shootCooldown > 0 && this.shootCooldown < 0.4; // last 0.4s before shot

        if (m.gl) {
            m.gl.alpha = isCharging ? 0.45 : 0.15;
            m.gl.scale.set(isCharging ? 1.35 : 1);
        }

        return { moveX, moveY, attackOverride: true };
    }

    shoot(ctx) {
        const { world, px, py, enemyProjs, openWorld } = ctx;
        const m = this.mob;

        let elementalType = 'normal';

        audioManager.playSFX('/sounds/shoot.mp3', 0.1)

        switch (m.biome) {
            case 'ice':
                elementalType = 'lightning';
                break;

            case 'lava':
                elementalType = 'burn';
                break;

            case 'desert':
                elementalType = 'poison';
                break;

            default:
                elementalType = 'normal';
        }

        const proj = createEnemyProj(
            openWorld.entityLayer,
            m.x,
            m.y,
            px,
            py,
            'enemy_orb', // projectile type
            m.damage,           // damage
            m.attackSpeed,         // speed
            8,           // size
            0,           // angle offset
            elementalType
        );

        if (enemyProjs) {
            enemyProjs.push(proj);
        }
    }
}