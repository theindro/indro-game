import {Container, Graphics} from 'pixi.js';
import {VFX} from "../GlobalEffects.js";
import {frameScale, GROUND_IMPACT_TICKS, GROUND_WARN_NORMAL} from "../constants.js";

/** Vertical squash on ground-attack containers (isometric ground plane). */
export const GROUND_ATTACK_Y_SQUASH = 0.6;

function unskewGroundDy(dy) {
    return dy / GROUND_ATTACK_Y_SQUASH;
}

function worldHalfYFromLocal(localHalf) {
    return localHalf * GROUND_ATTACK_Y_SQUASH;
}

function distToSegment(px, py, x1, y1, x2, y2) {
    const abx = x2 - x1;
    const aby = y2 - y1;
    const apx = px - x1;
    const apy = py - y1;
    const ab2 = abx * abx + aby * aby;
    const t = ab2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2)) : 0;
    const closestX = x1 + t * abx;
    const closestY = y1 + t * aby;
    return Math.hypot(px - closestX, py - closestY);
}

function clampByte(v) {
    return Math.max(0, Math.min(255, Math.floor(v)));
}

/** @param {number|string|undefined} color */
export function normalizeGroundAttackColor(color) {
    if (typeof color === 'number' && Number.isFinite(color)) {
        return color >>> 0;
    }
    if (typeof color === 'string') {
        const hex = color.trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            return parseInt(hex, 16);
        }
    }
    return 0xff4444;
}

function mixChannel(from, to, t) {
    return clampByte(from + (to - from) * t);
}

/** Derive warning / inner colors from the primary attack tint when omitted. */
export function resolveGroundAttackPalette(color) {
    const base = normalizeGroundAttackColor(color);
    const r = (base >> 16) & 0xff;
    const g = (base >> 8) & 0xff;
    const b = base & 0xff;

    const warning = (mixChannel(r, 0, 0.45) << 16)
        | (mixChannel(g, 0, 0.45) << 8)
        | mixChannel(b, 0, 0.45);

    const inner = (mixChannel(r, 255, 0.42) << 16)
        | (mixChannel(g, 255, 0.42) << 8)
        | mixChannel(b, 255, 0.42);

    return { color: base, warningColor: warning, innerColor: inner };
}

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

        this.container.scale.set(1, GROUND_ATTACK_Y_SQUASH);

        this.container.sortableChildren = true;

        // Position
        this.x = x;
        this.y = y;

        // If anchored to a moving object (like boss or mob)
        this.anchor = config.anchor ?? null;
        this.anchorOffsetX = config.anchorOffsetX ?? 0;
        this.anchorOffsetY = config.anchorOffsetY ?? 0;

        const palette = resolveGroundAttackPalette(config.color ?? 0xff4444);

        this.config = {
            shape: config.shape ?? 'circle',
            radius: config.radius ?? 50,
            width: config.width ?? 100,
            height: config.height ?? 100,
            angle: config.angle ?? 0,
            arcAngle: config.arcAngle ?? Math.PI / 2,
            trackPlayer: config.trackPlayer ?? false,
            warningDuration: config.warningDuration ?? GROUND_WARN_NORMAL,
            damage: config.damage ?? 25,
            onHit: config.onHit ?? null,
            onImpact: config.onImpact ?? null,
            onComplete: config.onComplete ?? null,
            hitboxRadius: config.hitboxRadius ?? 15,
            ...config,
            color: normalizeGroundAttackColor(config.color ?? palette.color),
            warningColor: config.warningColor != null
                ? normalizeGroundAttackColor(config.warningColor)
                : palette.warningColor,
            innerColor: config.innerColor != null
                ? normalizeGroundAttackColor(config.innerColor)
                : palette.innerColor,
        };

        this.timer = 0;
        this.hasHit = false;
        this.complete = false;
        this.hasStoppedTracking = false;
        this.currentAngle = this.config.angle;

        this.impactGlowAdded = false;
        this.impactVfxPlayed = false;

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
                this._triggerImpactGlow();
            }

            if (!this.impactVfxPlayed) {
                this.impactVfxPlayed = true;
                if (this.config.onImpact) {
                    this.config.onImpact(this.x, this.y);
                }
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

    _getAttackSize() {
        switch (this.config.shape) {
            case 'circle':
            case 'pizza':
                return this.config.radius;
            case 'rectangle':
            case 'cross':
                return Math.max(this.config.width, this.config.height) * 0.5;
            case 'line':
                return this.config.width * 0.5;
            default:
                return 50;
        }
    }

    _applyImpactSquash() {
        const impactProgress = this.impactTimer / this.impactDuration;
        const impactScale = 1 + (1 - impactProgress) * 0.12;
        this.container.scale.set(impactScale, GROUND_ATTACK_Y_SQUASH * impactScale);
        return 0.55 * (1 - impactProgress);
    }

    _resetWarningSquash() {
        this.container.scale.set(1, GROUND_ATTACK_Y_SQUASH);
    }

    /** Cross arm metrics: local draw sizes + world-space hit extents. */
    _crossMetrics() {
        const w = this.config.width;
        const h = this.config.height;
        const armThickWorld = Math.max(26, Math.min(w, h) * 0.13);
        const armThickLocalY = armThickWorld / GROUND_ATTACK_Y_SQUASH;

        return {
            halfW: w / 2,
            halfHWorld: worldHalfYFromLocal(h / 2),
            armThickX: armThickWorld,
            armThickLocalY,
            halfArmWorldX: armThickWorld / 2,
            halfArmWorldY: worldHalfYFromLocal(armThickLocalY / 2),
        };
    }

    _triggerImpactGlow() {
        const glowScale = Math.max(1.4, this._getAttackSize() / 95);

        VFX.addGlow(0, 0, {
            color: this.config.color,
            alpha: 0.25,
            scale: glowScale,
        }, this.container);

    }

    _pizzaAngles() {
        const angle = this.config.angle;
        const arcAngle = this.config.arcAngle;
        return {
            startAngle: angle - arcAngle / 2,
            endAngle: angle + arcAngle / 2,
        };
    }

    _fillPizzaSector(radius, fillColor, alpha) {
        const { startAngle, endAngle } = this._pizzaAngles();
        this.g.moveTo(0, 0);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            this.g.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        }
        this.g.closePath();
        this.g.fill({ color: fillColor, alpha });
    }

    _drawCircle(progress) {

        const R = this.config.radius;

        if (this.phase === 'impact') {
            const alpha = this._applyImpactSquash();

            this.g.circle(0, 0, R)
                .fill({ color: this.config.color, alpha });

            this.g.circle(0, 0, R * 0.7)
                .fill({ color: this.config.innerColor, alpha: alpha * 0.7 });

            return;
        }

        this._resetWarningSquash();

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

        if (this.phase === 'impact') {
            const alpha = this._applyImpactSquash();
            this.g.rect(-w / 2, -h / 2, w, h)
                .fill({ color: this.config.color, alpha });
            this.g.rect(-w * 0.35, -h * 0.35, w * 0.7, h * 0.7)
                .fill({ color: this.config.innerColor, alpha: alpha * 0.72 });
            return;
        }

        this._resetWarningSquash();

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
        const { startAngle, endAngle } = this._pizzaAngles();

        if (this.phase === 'impact') {
            const alpha = this._applyImpactSquash();
            this._fillPizzaSector(R, this.config.color, alpha);
            this._fillPizzaSector(R * 0.72, this.config.innerColor, alpha * 0.75);
            return;
        }

        this._resetWarningSquash();

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

        if (this.phase === 'impact') {
            const alpha = this._applyImpactSquash();
            const startX = -Math.cos(angle) * halfLength;
            const startY = -Math.sin(angle) * halfLength;
            const endX = Math.cos(angle) * halfLength;
            const endY = Math.sin(angle) * halfLength;

            this.g.moveTo(startX, startY).lineTo(endX, endY)
                .stroke({ color: this.config.color, alpha, width: 16 });
            this.g.moveTo(startX, startY).lineTo(endX, endY)
                .stroke({ color: this.config.innerColor, alpha: alpha * 0.72, width: 9 });
            return;
        }

        this._resetWarningSquash();

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

    _drawCrossArms(m, opts) {
        const { w, h, armThickX, armThickLocalY } = m;
        const {
            mode = 'stroke',
            color = this.config.warningColor,
            innerColor = this.config.innerColor,
            alpha = 0.6,
            innerAlpha = 0.7,
            width = 3,
            innerWidth = 2,
            fillAlpha = 0.55,
        } = opts;

        const hY = armThickLocalY / 2;
        const hX = armThickX / 2;

        const drawBar = (x, y, bw, bh, col, a, lw) => {
            if (mode === 'fill') {
                this.g.rect(x, y, bw, bh).fill({ color: col, alpha: a });
            } else {
                this.g.rect(x, y, bw, bh).stroke({ color: col, alpha: a, width: lw });
            }
        };

        drawBar(-w / 2, -hY, w, armThickLocalY, color, alpha, width);
        drawBar(-hX, -h / 2, armThickX, h, color, alpha, width);

        if (mode === 'fill' && innerColor != null) {
            drawBar(-w * 0.3, -hY * 0.65, w * 0.6, armThickLocalY * 0.65, innerColor, innerAlpha, innerWidth);
            drawBar(-hX * 0.65, -h * 0.3, armThickX * 0.65, h * 0.6, innerColor, innerAlpha, innerWidth);
        }
    }

    _drawCross(progress) {
        const w = this.config.width;
        const h = this.config.height;
        const m = this._crossMetrics();

        if (this.phase === 'impact') {
            const alpha = this._applyImpactSquash();
            this._drawCrossArms(m, {
                mode: 'fill',
                color: this.config.color,
                innerColor: this.config.innerColor,
                alpha,
                innerAlpha: alpha * 0.72,
            });
            return;
        }

        this._resetWarningSquash();

        const borderOffset = Math.min(w / 2, h / 2) * progress;
        const shrink = borderOffset;

        this._drawCrossArms(
            {
                ...m,
                w: w - shrink * 2,
                h: h - shrink * 2,
                armThickLocalY: Math.max(8, m.armThickLocalY - shrink * 0.6),
                armThickX: Math.max(8, m.armThickX - shrink * 0.3),
            },
            { mode: 'stroke', alpha: 0.6 + Math.sin(this.timer * 0.2) * 0.3, width: 3 }
        );

        this._drawCrossArms(
            {
                ...m,
                w: Math.max(0, w - shrink * 4),
                h: Math.max(0, h - shrink * 4),
                armThickLocalY: Math.max(6, m.armThickLocalY - shrink * 0.9),
                armThickX: Math.max(6, m.armThickX - shrink * 0.5),
            },
            {
                mode: 'stroke',
                color: this.config.color,
                innerColor: this.config.innerColor,
                alpha: 0.9,
                innerAlpha: 0.7,
                width: 4,
                innerWidth: 2,
            }
        );
    }

    _checkHit(px, py) {
        // ✅ Hit detection stays EXACTLY the same (uses world coordinates)
        switch(this.config.shape) {
            case 'circle': {
                const dx = px - this.x;
                const dy = unskewGroundDy(py - this.y);
                const dist = Math.hypot(dx, dy);
                return dist <= this.config.radius;
            }
            case 'rectangle': {
                const halfW = this.config.width / 2;
                const halfH = worldHalfYFromLocal(this.config.height / 2);
                return Math.abs(px - this.x) <= halfW && Math.abs(py - this.y) <= halfH;
            }
            case 'pizza': {
                const dx = px - this.x;
                const dy = unskewGroundDy(py - this.y);
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
                const dx = px - this.x;
                const dy = unskewGroundDy(py - this.y);

                const x1 = -Math.cos(angle) * halfLength;
                const y1 = -Math.sin(angle) * halfLength;
                const x2 = Math.cos(angle) * halfLength;
                const y2 = Math.sin(angle) * halfLength;

                const dist = distToSegment(dx, dy, x1, y1, x2, y2);
                return dist <= (this.config.hitboxRadius || 15);
            }
            case 'cross': {
                const m = this._crossMetrics();
                const inHorizontal =
                    Math.abs(px - this.x) <= m.halfW &&
                    Math.abs(py - this.y) <= m.halfArmWorldY;
                const inVertical =
                    Math.abs(px - this.x) <= m.halfArmWorldX &&
                    Math.abs(py - this.y) <= m.halfHWorld;
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
