import { createEnemyProj } from "../createProjectileController.js";

export class RangedArchetype {
    constructor(mob, ctx) {
        this.mob = mob;
        this.shootCooldown = 0;
        this.shootRange = 350;
        this.fleeRange = 150;
        this.projectileType = 'magic';
    }

    update(ctx) {
        const { px, py, world, enemyProjs } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        let moveX = 0, moveY = 0;

        // Ranged behavior: keep distance
        if (distToPlayer < this.fleeRange) {
            // Flee from player
            moveX = (m.x - px) / distToPlayer;
            moveY = (m.y - py) / distToPlayer;
            moveX *= m.speed * 1.2;
            moveY *= m.speed * 1.2;
        } else if (distToPlayer > this.shootRange) {
            // Move closer if too far
            moveX = (px - m.x) / distToPlayer;
            moveY = (py - m.y) / distToPlayer;
            moveX *= m.speed * 0.8;
            moveY *= m.speed * 0.8;
        }

        // Shooting
        if (this.shootCooldown <= 0 && distToPlayer < this.shootRange && distToPlayer > this.fleeRange) {
            this.shoot(ctx);
            this.shootCooldown = 45; // 0.75 seconds at 60fps
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        // Visual: charge up when about to shoot
        const isCharging = this.shootCooldown > 35 && this.shootCooldown < 42;
        if (m.gl) {
            m.gl.alpha = isCharging ? 0.4 : 0.15;
            if (isCharging) m.gl.scale.set(1.3, 1.3);
            else m.gl.scale.set(1, 1);
        }

        return { moveX, moveY, attackOverride: true };
    }

    shoot(ctx) {
        const { world, px, py, enemyProjs, openWorld } = ctx;
        const m = this.mob;

        let elementalType = 'normal';

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
            3.5,         // speed
            8,           // size
            0,           // angle offset
            elementalType
        );

        if (enemyProjs) {
            enemyProjs.push(proj);
        }
    }
}