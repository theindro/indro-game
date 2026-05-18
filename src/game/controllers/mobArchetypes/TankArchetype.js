import { Container, Graphics } from 'pixi.js';
import { GroundAttackController } from '../createGroundAttackController.js';
import { GROUND_WARN_NORMAL } from '../../constants.js';
import { VFX } from '../../GlobalEffects.js';

const CAST_DURATION_SEC = GROUND_WARN_NORMAL / 60;
const EYE_COLOR_IDLE = 0xffffff;
const EYE_COLOR_CAST = 0x44ccff;
const SPARK_COUNT = 10;

function redrawMobEye(eye, shape, size, fillColor) {
    if (!eye || !shape?.eye) return;
    const s = Math.min(size / 13, 2);
    const eyeX = shape.eye.x * s;
    const eyeY = shape.eye.y * s;
    eye.clear();
    eye.moveTo(eyeX, eyeY)
        .lineTo(eyeX - 8 * s, eyeY - 2 * s)
        .lineTo(eyeX - 6 * s, eyeY + 1 * s)
        .closePath()
        .fill(fillColor);
}

export class TankArchetype {
    constructor(mob, entityLayer) {
        this.mob = mob;
        this.slamRadius = 150;
        this.groundSlamCooldown = Math.random() * 1.0;
        this.groundAttacks = new GroundAttackController(entityLayer, mob);

        this.isCasting = false;
        this.castTimer = 0;
        this._slamX = 0;
        this._slamY = 0;

        this._initSparkAura();
        this._setEyeColor(EYE_COLOR_IDLE);
    }

    _initSparkAura() {
        return;
        const m = this.mob;
        this.sparkLayer = new Container();
        this.sparkLayer.zIndex = 50;
        m.c.sortableChildren = true;
        m.c.addChild(this.sparkLayer);

        /** @type {{ g: Graphics, angle: number, phase: number, distMul: number }[]} */
        this.sparks = [];

        for (let i = 0; i < SPARK_COUNT; i++) {
            const g = new Graphics();
            g.moveTo(0, 0)
                .lineTo(3, -7)
                .lineTo(1, -5)
                .stroke({ color: 0xaaddff, width: 1.4, alpha: 0.85 });
            g.blendMode = 'add';

            this.sparks.push({
                g,
                angle: (i / SPARK_COUNT) * Math.PI * 2,
                phase: Math.random() * Math.PI * 2,
                distMul: 0.45 + Math.random() * 0.35,
            });
            this.sparkLayer.addChild(g);
        }
    }

    _updateSparkAura(dt, casting) {
        return;
        const m = this.mob;
        const t = performance.now() * 0.001;
        const baseR = m.size * 0.62;
        const spin = casting ? 4.2 : 1.6;

        for (const sp of this.sparks) {
            sp.angle += dt * spin;
            const flicker = 0.25 + Math.sin(t * 14 + sp.phase) * 0.35 + Math.sin(t * 23 + sp.phase * 2) * 0.2;
            const castBoost = casting ? 0.45 : 0;
            sp.g.alpha = Math.min(1, flicker + castBoost);

            const r = baseR * sp.distMul * (1 + Math.sin(t * 5 + sp.phase) * 0.1);
            sp.g.x = Math.cos(sp.angle) * r;
            sp.g.y = Math.sin(sp.angle) * r * 0.55 - m.size * 0.35;
            sp.g.rotation = sp.angle + Math.PI * 0.5;
            sp.g.scale.set(casting ? 1.35 : 1);
        }

        if (casting && Math.random() < dt * 18) {
            VFX.sparks(m.x + (Math.random() - 0.5) * m.size, m.y - m.size * 0.4, 4);
        }
    }

    _setEyeColor(color) {
        const m = this.mob;
        redrawMobEye(m.eye, m.shapeDef, m.size, color);
    }

    _applyCastBodyAnim() {
        const m = this.mob;
        const c = m.c;
        const t = performance.now() * 0.009;
        const progress = 1 - Math.max(0, this.castTimer / CAST_DURATION_SEC);
        const facing = c.scale.x < 0 ? -1 : 1;

        const swell = 1 + Math.sin(t * 2.2) * 0.07 + progress * 0.05;
        const squash = 1 - Math.sin(t * 2.2) * 0.06 - progress * 0.04;
        const lean = Math.sin(t * 1.4) * 0.04;

        c.scale.set(facing * swell, squash);
        c.rotation = lean * facing;
        m.body.alpha = 0.92 + Math.sin(t * 3) * 0.08;
    }

    _resetBodyAnim() {
        const m = this.mob;
        m.c.rotation = 0;
        m.body.alpha = 1;
    }

    _beginCast(px, py) {
        this.isCasting = true;
        this.castTimer = CAST_DURATION_SEC;
        this._slamX = px;
        this._slamY = py;
        this.mob.isCasting = true;
        this._setEyeColor(EYE_COLOR_CAST);
        this.performGroundSlam();
    }

    _endCast() {
        this.isCasting = false;
        this.castTimer = 0;
        this.mob.isCasting = false;
        this._setEyeColor(EYE_COLOR_IDLE);
        this._resetBodyAnim();
    }

    update(entityLayer) {
        const { px, py, dt } = entityLayer;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        if (this.isCasting) {
            this.castTimer -= dt;
            this._updateSparkAura(dt, true);
            this._applyCastBodyAnim();

            if (this.castTimer <= 0) {
                this._endCast();
                this.groundSlamCooldown = 2.0 + Math.random() * 1.0;
            }

            return { moveX: 0, moveY: 0, attackOverride: true };
        }

        this._updateSparkAura(dt, false);

        let moveX = 0;
        let moveY = 0;

        if (distToPlayer > 30) {
            moveX = (px - m.x) / distToPlayer;
            moveY = (py - m.y) / distToPlayer;
            moveX *= m.speed;
            moveY *= m.speed;
        }

        if (this.groundSlamCooldown <= 0 && distToPlayer < this.slamRadius + 300) {
            this._beginCast(px, py);
            return { moveX: 0, moveY: 0, attackOverride: true };
        }

        if (this.groundSlamCooldown > 0) {
            this.groundSlamCooldown -= dt;
        }

        return { moveX, moveY, attackOverride: false };
    }

    performGroundSlam() {
        this.groundAttacks.addAttack(this._slamX, this._slamY, {
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
    }

    destroy() {
        this._endCast();
        if (this.sparkLayer && !this.sparkLayer.destroyed) {
            this.sparkLayer.destroy({ children: true });
        }
        this.sparks = [];
        if (this.groundAttacks) {
            this.groundAttacks.clear();
            this.groundAttacks = null;
        }
    }
}
