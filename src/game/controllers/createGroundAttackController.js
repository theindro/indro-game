import {Container, Graphics} from 'pixi.js';
import {VFX} from "../GlobalEffects.js";
import {frameScale, GROUND_IMPACT_TICKS, GROUND_WARN_NORMAL} from "../constants.js";

// In GroundAttack.js - Updated GroundAttackManager
export class GroundAttackController {
    constructor(world, owner = null) {
        this.world = world;
        this.attacks = [];
        this.owner = owner; // Store reference to boss/mob
        this.active = true;
        this.world.sortableChildren = true;
    }

    addAttack(x, y, config = {}) {
        if (!this.active) return null;

        const attack = new GroundAttack(this.world, x, y, {
            ...config,
            owner: this.owner // Pass owner to attack
        });
        this.attacks.push(attack);
        return attack;
    }

    update(playerX, playerY, onDamage, dt = 1 / 60) {
        // Don't update if manager is inactive OR owner is dead
        if (!this.active || (this.owner && this.owner.dead)) {
            return;
        }

        for (let i = this.attacks.length - 1; i >= 0; i--) {
            const attack = this.attacks[i];

            // Skip if attack's owner died
            if (attack.owner && attack.owner.dead) {
                attack.destroy();
                this.attacks.splice(i, 1);
                continue;
            }

            attack.update(playerX, playerY, onDamage, dt);

            if (attack.complete) {
                attack.destroy();
                this.attacks.splice(i, 1);
            }
        }
    }

    clear() {
        for (const attack of this.attacks) {
            attack.destroy();
        }
        this.attacks = [];
        this.active = false;
    }

    // Add this method to check if owner is dead
    isOwnerDead() {
        return this.owner && this.owner.dead;
    }
}

export class GroundAttack {
    constructor(world, x, y, config = {}) {
        this.world = world;

        // ✅ CHANGE 1: Create container and move graphics into it
        this.container = new Container();
        this.g = new Graphics();

        this.container.addChild(this.g);
        this.world.addChild(this.container);

        // ✅ CHANGE 2: Apply squash effect (add this line)
        this.container.scale.set(1, 0.6);  // squash vertically

        this.container.sortableChildren = true;

        // Position
        this.x = x;
        this.y = y;

        // If anchored to a moving object (like boss or mob)
        this.anchor = config.anchor ?? null;
        this.anchorOffsetX = config.anchorOffsetX ?? 0;
        this.anchorOffsetY = config.anchorOffsetY ?? 0;

        // Attack configuration
        this.config = {
            shape: config.shape ?? 'circle',
            color: config.color ?? 0xff4444,
            warningColor: config.warningColor ?? 0xff0000,
            innerColor: config.innerColor ?? 0xff8888,
            radius: config.radius ?? 50,
            width: config.width ?? 100,
            height: config.height ?? 100,
            angle: config.angle ?? 0,
            arcAngle: config.arcAngle ?? Math.PI / 2,
            trackPlayer: config.trackPlayer ?? false,
            warningDuration: config.warningDuration ?? GROUND_WARN_NORMAL,
            damage: config.damage ?? 25,
            onHit: config.onHit ?? null,
            onComplete: config.onComplete ?? null,
            hitboxRadius: config.hitboxRadius ?? 15 // For line attacks
        };

        this.timer = 0;
        this.hasHit = false;
        this.complete = false;
        this.hasStoppedTracking = false;
        this.currentAngle = this.config.angle;

        this.impactGlowAdded = false;

        // phases
        this.phase = 'warning';
        this.impactTimer = 0;
        this.impactDuration = config.impactDuration ?? GROUND_IMPACT_TICKS;
    }

    update(playerX, playerY, onDamageCallback, dt = 1 / 60) {
        if (this.complete) return;

        const fs = frameScale(dt);

        // Update position if anchored to a moving object
        if (this.anchor && !this.anchor.dead) {
            this.x = this.anchor.x + this.anchorOffsetX;
            this.y = this.anchor.y + this.anchorOffsetY;

            // For attacks that should track the player
            if (this.config.trackPlayer && this.anchor.lastPlayerX) {
                const progress = this.timer / this.config.warningDuration;
                const shouldTrack = (progress < 0.5 && !this.hasStoppedTracking);

                if (shouldTrack) {
                    const dx = this.anchor.lastPlayerX - this.anchor.x;
                    const dy = this.anchor.lastPlayerY - this.anchor.y;
                    this.currentAngle = Math.atan2(dy, dx);
                    this.config.angle = this.currentAngle;
                } else if (!this.hasStoppedTracking && progress >= 0.5) {
                    this.hasStoppedTracking = true;
                }
            }
        }

        // ✅ CHANGE 3: Position the container
        this.container.x = this.x;
        this.container.y = this.y;

        this.container.zIndex = this.y

        if (this.phase === 'warning') {
            this.timer += fs;
        }

        this.g.clear();

        const progress = Math.min(1, this.timer / this.config.warningDuration);

        // Draw based on shape (using 0,0 local coordinates)
        switch(this.config.shape) {
            case 'circle':
                this._drawCircle(progress);
                break;
            case 'rectangle':
                this._drawRectangle(progress);
                break;
            case 'pizza':
                this._drawPizza(progress);
                break;
            case 'line':
                this._drawLine(progress);
                break;
            case 'cross':
                this._drawCross(progress);
                break;
        }

        // Damage check when animation completes

        if (
            this.phase === 'warning' &&
            this.timer >= this.config.warningDuration
        ) {

            this.phase = 'impact';

            if (!this.impactGlowAdded) {
                this.impactGlowAdded = true;

                VFX.addGlow(0, 0, {
                    color: this.config.color,
                    scale: 1.25,
                }, this.container);
            }

            // damage happens EXACTLY here
            if (!this.hasHit) {

                this.hasHit = true;

                if (this._checkHit(playerX, playerY)) {

                    if (onDamageCallback) {
                        onDamageCallback(this.config.damage);
                    }

                    if (this.config.onHit) {
                        this.config.onHit(playerX, playerY);
                    }
                }
            }
        }

        if (this.phase === 'impact') {
            this.impactTimer += fs;
            if (this.impactTimer >= this.impactDuration) {
                this.complete = true;
            }
        }
    }

    _drawCircle(progress) {

        const R = this.config.radius;

        const isImpact = this.phase === 'impact';

        // =========================================
        // IMPACT PHASE
        // =========================================

        if (isImpact) {

            const impactProgress = this.impactTimer / this.impactDuration;

            const alpha =
                0.55 * (1 - impactProgress);

            const impactScale =
                1 + (1 - impactProgress) * 0.12;

            this.container.scale.set(
                impactScale,
                0.6 * impactScale
            );

            // BIG SOLID FLASH
            this.g.circle(0, 0, R)
                .fill({
                    color: this.config.color,
                    alpha
                });

            // bright center
            this.g.circle(0, 0, R * 0.7)
                .fill({
                    color: this.config.innerColor,
                    alpha: alpha * 0.7
                });


           //this.g.blendMode = 'add';

            return;
        }

        // =========================================
        // WARNING PHASE
        // =========================================

        this.container.scale.set(1, 0.6);

        const waveRadius = R * progress;

        this.g.circle(0, 0, R)
            .stroke({
                color: this.config.warningColor,
                alpha: 0.6 + Math.sin(this.timer * 0.2) * 0.3,
                width: 3
            });

        this.g.circle(0, 0, R - 2)
            .fill({
                color: this.config.warningColor,
                alpha: 0.1
            });

        this.g.circle(0, 0, waveRadius)
            .stroke({
                color: this.config.color,
                alpha: 0.9,
                width: 4
            });

        this.g.circle(0, 0, waveRadius - 3)
            .stroke({
                color: this.config.innerColor,
                alpha: 0.7,
                width: 2
            });

        const particleCount =
            Math.min(12, Math.floor(progress * 20));

        for (let i = 0; i < particleCount; i++) {

            const angle =
                (i / particleCount) * Math.PI * 2
                + this.timer * 0.1;

            const x = Math.cos(angle) * waveRadius;
            const y = Math.sin(angle) * waveRadius;

            this.g.circle(x, y, 2)
                .fill({
                    color: this.config.color,
                    alpha: 0.8
                });
        }
    }

    _drawRectangle(progress) {
        const w = this.config.width;
        const h = this.config.height;
        const waveProgress = progress;
        const borderOffset = Math.min(w/2, h/2) * waveProgress;

        // ✅ CHANGE 5: Use 0,0 as center
        this.g.rect(-w/2, -h/2, w, h)
            .stroke({
                color: this.config.warningColor,
                alpha: 0.6 + Math.sin(this.timer * 0.2) * 0.3,
                width: 3
            });

        this.g.rect(-w/2 + 2, -h/2 + 2, w - 4, h - 4)
            .fill({ color: this.config.warningColor, alpha: 0.1 });

        this.g.rect(
            -w/2 + borderOffset,
            -h/2 + borderOffset,
            w - borderOffset * 2,
            h - borderOffset * 2
        ).stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.rect(
            -w/2 + borderOffset + 2,
            -h/2 + borderOffset + 2,
            w - borderOffset * 2 - 4,
            h - borderOffset * 2 - 4
        ).stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });
    }

    _drawPizza(progress) {
        const R = this.config.radius;
        const angle = this.config.angle;
        const arcAngle = this.config.arcAngle;
        const startAngle = angle - arcAngle/2;
        const endAngle = angle + arcAngle/2;
        const waveRadius = R * progress;

        // ✅ CHANGE 6: Use 0,0 as center
        this.g.moveTo(0, 0);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            const x = Math.cos(a) * R;
            const y = Math.sin(a) * R;
            this.g.lineTo(x, y);
        }
        this.g.closePath();
        this.g.stroke({ color: this.config.warningColor, alpha: 0.6, width: 3 });
        this.g.fill({ color: this.config.warningColor, alpha: 0.1 });

        this.g.moveTo(0, 0);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            const x = Math.cos(a) * waveRadius;
            const y = Math.sin(a) * waveRadius;
            this.g.lineTo(x, y);
        }
        this.g.closePath();
        this.g.stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.moveTo(0, 0);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            const x = Math.cos(a) * (waveRadius - 3);
            const y = Math.sin(a) * (waveRadius - 3);
            this.g.lineTo(x, y);
        }
        this.g.closePath();
        this.g.stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });
    }

    _drawLine(progress) {
        const w = this.config.width;
        const angle = this.config.angle;
        const halfLength = w / 2;
        const waveOffset = halfLength * progress;

        // ✅ CHANGE 7: Use 0,0 as center
        const startX = -Math.cos(angle) * halfLength;
        const startY = -Math.sin(angle) * halfLength;
        const endX = Math.cos(angle) * halfLength;
        const endY = Math.sin(angle) * halfLength;
        const waveStartX = -Math.cos(angle) * waveOffset;
        const waveStartY = -Math.sin(angle) * waveOffset;
        const waveEndX = Math.cos(angle) * waveOffset;
        const waveEndY = Math.sin(angle) * waveOffset;

        this.g.moveTo(startX, startY).lineTo(endX, endY)
            .stroke({ color: this.config.warningColor, alpha: 0.6, width: 8 });

        this.g.moveTo(waveStartX, waveStartY).lineTo(waveEndX, waveEndY)
            .stroke({ color: this.config.color, alpha: 0.9, width: 6 });

        this.g.moveTo(waveStartX, waveStartY).lineTo(waveEndX, waveEndY)
            .stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });
    }

    _drawCross(progress) {
        const w = this.config.width;
        const h = this.config.height;
        const borderOffset = Math.min(w/2, h/2) * progress;

        // ✅ CHANGE 8: Use 0,0 as center
        this.g.rect(-w/2, -15, w, 30)
            .stroke({ color: this.config.warningColor, alpha: 0.6, width: 3 });
        this.g.rect(-15, -h/2, 30, h)
            .stroke({ color: this.config.warningColor, alpha: 0.6, width: 3 });

        this.g.rect(
            -w/2 + borderOffset,
            -15 + borderOffset * 0.3,
            w - borderOffset * 2,
            30 - borderOffset * 0.6
        ).stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.rect(
            -15 + borderOffset * 0.3,
            -h/2 + borderOffset,
            30 - borderOffset * 0.6,
            h - borderOffset * 2
        ).stroke({ color: this.config.color, alpha: 0.9, width: 4 });
    }

    _checkHit(px, py) {
        // ✅ Hit detection stays EXACTLY the same (uses world coordinates)
        switch(this.config.shape) {
            case 'circle': {
                const dx = px - this.x;
                const dy = py - this.y;
                // Compensate for the 0.6 vertical squash
                const adjustedDy = dy / 0.6;
                const dist = Math.hypot(dx, adjustedDy);
                return dist <= this.config.radius;
            }
            case 'rectangle': {
                const halfW = this.config.width / 2;
                const halfH = (this.config.height / 2) * 0.6; // match visual squash
                return Math.abs(px - this.x) <= halfW && Math.abs(py - this.y) <= halfH;
            }
            case 'pizza': {
                const dx = px - this.x;
                const dy = py - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist > this.config.radius) return false;

                let angle = Math.atan2(dy, dx);
                const centerAngle = this.config.angle;
                const halfArc = this.config.arcAngle / 2;
                let diff = angle - centerAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                return Math.abs(diff) <= halfArc;
            }
            case 'line': {
                const w = this.config.width;
                const angle = this.config.angle;
                const halfLength = w / 2;

                const startX = this.x - Math.cos(angle) * halfLength;
                const startY = this.y - Math.sin(angle) * halfLength;
                const endX = this.x + Math.cos(angle) * halfLength;
                const endY = this.y + Math.sin(angle) * halfLength;

                const abx = endX - startX;
                const aby = endY - startY;
                const apx = px - startX;
                const apy = py - startY;
                const ab2 = abx * abx + aby * aby;
                const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
                const closestX = startX + t * abx;
                const closestY = startY + t * aby;
                const dist = Math.hypot(px - closestX, py - closestY);
                return dist <= (this.config.hitboxRadius || 15);
            }
            case 'cross': {
                const halfW = this.config.width / 2;
                const halfH = this.config.height / 2;
                const inHorizontal = Math.abs(px - this.x) <= halfW && Math.abs(py - this.y) <= 15;
                const inVertical = Math.abs(px - this.x) <= 15 && Math.abs(py - this.y) <= halfH;
                return inHorizontal || inVertical;
            }
            default:
                return false;
        }
    }

    destroy() {
        // ✅ CHANGE 9: Destroy the container (which destroys the graphics too)
        if (this.container && !this.container.destroyed) {
            if (this.container.parent) this.container.parent.removeChild(this.container);
            this.container.destroy({ children: true });
        }
    }
}
