/**
 * Flying bat: orbits home, periodically dashes at the player, then returns home.
 */
export class BatArchetype {
    constructor(mob) {
        this.mob = mob;
        this.homeX = mob.x;
        this.homeY = mob.y;
        /** @type {'hover'|'strike'|'return'} */
        this.phase = 'hover';
        this.strikeCooldown = 0.8 + Math.random() * 1.2;
        this.strikeTimer = 0;
        this.strikeMaxDuration = 1.1;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitRadius = 55 + Math.random() * 45;
        this.bobPhase = Math.random() * Math.PI * 2;
        this._didHitThisStrike = false;
        this._faceSign = 1;
    }

    update(ctx) {
        const { px, py, dt = 1 } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);
        const distHome = Math.hypot(this.homeX - m.x, this.homeY - m.y);

        this.strikeCooldown = Math.max(0, this.strikeCooldown - dt);
        this.bobPhase += dt * 5.5;

        let moveX = 0;
        let moveY = 0;
        let attackOverride = true;

        const strikeRange = 380;
        const aggroRange = 420;

        if (this.phase === 'hover') {
            this.orbitAngle += dt * 2.8;
            const orbitX = this.homeX + Math.cos(this.orbitAngle) * this.orbitRadius;
            const orbitY = this.homeY + Math.sin(this.orbitAngle) * this.orbitRadius * 0.75;

            const dx = orbitX - m.x;
            const dy = orbitY - m.y;
            const len = Math.hypot(dx, dy) || 1;
            const hoverSpeed = m.speed * 1.35;
            moveX = (dx / len) * hoverSpeed;
            moveY = (dy / len) * hoverSpeed;

            if (
                distToPlayer < strikeRange &&
                distToPlayer > 28 &&
                this.strikeCooldown <= 0 &&
                distHome < 200
            ) {
                this.phase = 'strike';
                this.strikeTimer = this.strikeMaxDuration;
                this._didHitThisStrike = false;
                this._strikeDirX = (px - m.x) / distToPlayer;
                this._strikeDirY = (py - m.y) / distToPlayer;
                this._faceSign = this._strikeDirX < 0 ? -1 : 1;
            }
        } else if (this.phase === 'strike') {
            this.strikeTimer -= dt;
            const strikeSpeed = m.speed * 2.85;
            moveX = this._strikeDirX * strikeSpeed;
            moveY = this._strikeDirY * strikeSpeed;

            if (distToPlayer < 30 && !this._didHitThisStrike) {
                this._didHitThisStrike = true;
                m._batPendingMelee = true;
            }

            if (
                this.strikeTimer <= 0 ||
                distToPlayer < 22 ||
                distHome > 520
            ) {
                this.phase = 'return';
                this.strikeCooldown = 2.2 + Math.random() * 1.4;
            }
        } else if (this.phase === 'return') {
            const dx = this.homeX - m.x;
            const dy = this.homeY - m.y;
            const len = Math.hypot(dx, dy) || 1;
            const returnSpeed = m.speed * 2.2;
            moveX = (dx / len) * returnSpeed;
            moveY = (dy / len) * returnSpeed;

            if (len < 36) {
                this.phase = 'hover';
                this.orbitAngle = Math.atan2(m.y - this.homeY, m.x - this.homeX);
            }
        }

        const bodyC = m.bodyC ?? m.c;
        const bob = Math.sin(this.bobPhase) * 4;
        if (bodyC) {
            bodyC.y = bob;
            const banking = this.phase === 'strike' ? 0.22 : 0.08;
            bodyC.rotation = Math.sin(this.bobPhase * 0.7) * banking;
            const sx = this._faceSign;
            if (this.phase === 'strike') {
                bodyC.scale.set(sx * 1.12, 0.92);
                if (m.gl) m.gl.alpha = 0.35;
            } else {
                bodyC.scale.set(sx, 1);
                if (m.gl) m.gl.alpha = 0.18;
            }
        }

        return { moveX, moveY, attackOverride };
    }

    destroy() {
        const bodyC = this.mob?.bodyC ?? this.mob?.c;
        if (bodyC) {
            bodyC.y = 0;
            bodyC.rotation = 0;
            bodyC.scale.set(this._faceSign ?? 1, 1);
        }
    }
}
