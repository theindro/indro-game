// abilities/createAbilityController.js
import { Graphics } from 'pixi.js';

export class CreateAbilityController {
    constructor(ctx) {
        this.ctx = ctx;
        this.world = ctx.world;
        this.particles = ctx.particles;
        this.floats = ctx.floats;
        this.mobs = ctx.entities.mobs;
        this.bosses = ctx.entities.bosses;
    }

    // Find nearest target
    findNearestTarget(px, py) {
        let nearestEnemy = null;
        let nearestDist = Infinity;

        for (const mob of this.mobs) {
            if (mob.hp <= 0) continue;
            const dist = Math.hypot(mob.x - px, mob.y - py);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = { type: 'mob', target: mob, x: mob.x, y: mob.y };
            }
        }

        for (const boss of this.bosses) {
            if (boss.dead) continue;
            const dist = Math.hypot(boss.x - px, boss.y - py);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = { type: 'boss', target: boss, x: boss.x, y: boss.y };
            }
        }

        return nearestEnemy;
    }

    // Apply freeze effect
    applyFreezeEffect(target, duration, slowAmount) {
        if (!target || target.hp <= 0) return;

        if (!target.originalSpeed) {
            target.originalSpeed = target.speed;
        }

        target.speed = target.originalSpeed * (1 - slowAmount);
        target.frozen = true;
        target.freezeEndTime = performance.now() + duration;

        if (!target.freezeGraphics) {
            target.freezeGraphics = new Graphics();
            target.c.addChild(target.freezeGraphics);
        }

        this.updateFreezeVisual(target);
    }

    // Update freeze visual effect
    updateFreezeVisual(target) {
        if (!target.freezeGraphics) return;
        target.freezeGraphics.clear();

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 18;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            target.freezeGraphics.moveTo(x, y);
            target.freezeGraphics.lineTo(x + 4, y + 8);
            target.freezeGraphics.lineTo(x - 4, y + 8);
            target.freezeGraphics.closePath();
            target.freezeGraphics.fill({ color: 0x88ccff, alpha: 0.6 });
        }

        target.freezeGraphics.circle(0, 0, 15).stroke({ color: 0xaaddff, alpha: 0.8, width: 2 });
        target.freezeGraphics.circle(0, 0, 12).fill({ color: 0x88ccff, alpha: 0.2 });
    }

    // Remove freeze effect
    removeFreezeEffect(target) {
        if (target.originalSpeed) {
            target.speed = target.originalSpeed;
            delete target.originalSpeed;
        }
        target.frozen = false;

        if (target.freezeGraphics) {
            target.c.removeChild(target.freezeGraphics);
            target.freezeGraphics.destroy();
            target.freezeGraphics = null;
        }
    }

    // Update freeze timers
    updateFreezeTimers() {
        const now = performance.now();

        for (const mob of this.mobs) {
            if (mob.frozen && mob.freezeEndTime && now >= mob.freezeEndTime) {
                this.removeFreezeEffect(mob);
            }
        }

        for (const boss of this.bosses) {
            if (boss.frozen && boss.freezeEndTime && now >= boss.freezeEndTime) {
                this.removeFreezeEffect(boss);
            }
        }
    }
}