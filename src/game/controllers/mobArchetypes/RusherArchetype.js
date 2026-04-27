export class RusherArchetype {
    constructor(mob, ctx) {
        this.mob = mob;
        this.dashCooldown = 2;
        this.dashSpeed = 5.5;
        this.dashDuration = 15;
        this.dashing = false;
        this.dashTimer = 0;
    }

    update(ctx) {
        const { px, py, dt } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        // Rush behavior: dash when close enough
        if (this.dashCooldown <= 0 && distToPlayer < 250 && !this.dashing) {
            this.dashing = true;
            this.dashTimer = this.dashDuration;
            // Store dash direction
            this.dashDirX = (px - m.x) / distToPlayer;
            this.dashDirY = (py - m.y) / distToPlayer;
        }

        let moveX = 0, moveY = 0;

        if (this.dashing && this.dashTimer > 0) {
            // Dashing
            moveX = this.dashDirX * this.dashSpeed;
            moveY = this.dashDirY * this.dashSpeed;
            this.dashTimer--;

            if (this.dashTimer <= 0) {
                this.dashing = false;
                this.dashCooldown = 300; // 1.5 seconds at 60fps
            }
        } else {
            // Normal chase (faster than normal mobs)
            if (this.dashCooldown > 0) this.dashCooldown--;

            if (distToPlayer > 10) {
                moveX = (px - m.x) / distToPlayer;
                moveY = (py - m.y) / distToPlayer;
                // Scale speed - rushers are naturally fast
                const speedMult = 1.4;
                moveX *= m.speed * speedMult;
                moveY *= m.speed * speedMult;
            }
        }

        // Visual feedback when dashing
        if (this.dashing) {
            m.c.scale.set(1.2, 0.8);
            if (m.gl) m.gl.alpha = 0.4;
        } else {
            m.c.scale.set(1, 1);
            if (m.gl) m.gl.alpha = 0.15;
        }

        return { moveX, moveY, attackOverride: this.dashing };
    }

    onDamage(amount, source) {
        // Rushers take extra knockback
        return { knockbackMult: 1.5 };
    }
}