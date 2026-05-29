import { createEnemyProj } from "../createProjectileController.js";
import { audioManager } from "../../utils/audioManager.js";
import { ENEMY_RANGED_ORB_SPEED_SCALE } from "../../constants.js";
import { VFX } from "../../GlobalEffects.js";

const ELITE_CYCLE_VISIBLE_MIN = 3.2;
const ELITE_CYCLE_VISIBLE_MAX = 5.2;
const ELITE_STALK_RANGE = 115;
const ELITE_STALK_SPEED_MULT = 2.4;
const ELITE_BURST_SHOT_GAP = 0.13;
const ELITE_FADE_DURATION_SEC = 1;

export class RangedArchetype {
    constructor(mob, ctx) {
        this.mob = mob;
        this.shootCooldown = 0;
        this.shootRange = 350;
        this.fleeRange = 150;
        this.projectileType = 'magic';

        if (mob.isElite) {
            this.elitePhase = 'visible';
            this.eliteCycleTimer = 2.5 + Math.random() * 1.5;
            this.eliteBurstShotsLeft = 0;
            this.eliteBurstShotTimer = 0;
            this.eliteFade = 1;
            this.eliteFadeTarget = 1;
            this._revealPinged = false;
        }
    }

    update(ctx) {
        if (this.mob.isElite) {
            return this._updateElite(ctx);
        }
        return this._updateStandard(ctx);
    }

    _setFadeTarget(target) {
        this.eliteFadeTarget = target;
    }

    _tickFade(dt) {
        const step = dt / ELITE_FADE_DURATION_SEC;
        const prev = this.eliteFade;

        if (this.eliteFade < this.eliteFadeTarget) {
            this.eliteFade = Math.min(this.eliteFadeTarget, this.eliteFade + step);
        } else if (this.eliteFade > this.eliteFadeTarget) {
            this.eliteFade = Math.max(this.eliteFadeTarget, this.eliteFade - step);
        }

        if (
            this.elitePhase === 'burst' &&
            !this._revealPinged &&
            prev < 0.55 &&
            this.eliteFade >= 0.55
        ) {
            this._revealPinged = true;
            VFX.addFloat('!', this.mob.x, this.mob.y - 28, '#ffeedd', { opacity: 0.85 });
        }

        this._applyFadeAlpha();
    }

    _applyFadeAlpha() {
        const f = this.eliteFade;
        const m = this.mob;

        m._eliteStealthed = f < 0.35;

        if (m.c) m.c.alpha = f;
        if (m.bodyC) m.bodyC.alpha = f;
        if (m.body) m.body.alpha = f;
        if (m.uiC) m.uiC.alpha = 0.2 + f * 0.8;

        if (m.gl) {
            m.gl.visible = f > 0.03;
            let glowBase = 0.15;
            if (this.elitePhase === 'burst') glowBase = 0.5;
            else if (this.shootCooldown > 0 && this.shootCooldown < 0.4) glowBase = 0.45;
            m.gl.alpha = glowBase * f;
            if (this.elitePhase === 'burst') {
                m.gl.scale.set(1.2 + f * 0.2);
            }
        }

        if (m.eliteAura?.root) {
            m.eliteAura.root.alpha = f;
        }
    }

    _updateElite(ctx) {
        const { px, py, dt = 1 } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        if (this.elitePhase === 'visible') {
            this._setFadeTarget(1);
            this._tickFade(dt);
            this.eliteCycleTimer -= dt;

            if (this.eliteCycleTimer <= 0) {
                this.elitePhase = 'hidden';
                this._setFadeTarget(0);
                this._revealPinged = false;
            }

            const result = this._updateStandard(ctx);
            this._applyFadeAlpha();
            return result;
        }

        if (this.elitePhase === 'hidden') {
            this._setFadeTarget(0);
            this._tickFade(dt);

            const dx = px - m.x;
            const dy = py - m.y;
            const len = distToPlayer || 1;
            const speed = m.speed * ELITE_STALK_SPEED_MULT;

            let moveX = (dx / len) * speed;
            let moveY = (dy / len) * speed;

            if (distToPlayer <= ELITE_STALK_RANGE) {
                this.elitePhase = 'burst';
                this._setFadeTarget(1);
                this.eliteBurstShotsLeft = 3 + Math.floor(Math.random() * 3);
                this.eliteBurstShotTimer = 0.35;
                this._revealPinged = false;
            }

            return { moveX, moveY, attackOverride: true };
        }

        if (this.elitePhase === 'burst') {
            this._setFadeTarget(1);
            this._tickFade(dt);

            let moveX = 0;
            let moveY = 0;

            if (distToPlayer > this.fleeRange + 20) {
                const dx = px - m.x;
                const dy = py - m.y;
                const len = distToPlayer || 1;
                moveX = (dx / len) * m.speed * 0.5;
                moveY = (dy / len) * m.speed * 0.5;
            } else if (distToPlayer < this.fleeRange * 0.85) {
                moveX = ((m.x - px) / distToPlayer) * m.speed * 0.6;
                moveY = ((m.y - py) / distToPlayer) * m.speed * 0.6;
            }

            this.eliteBurstShotTimer -= dt;
            const canBurstFire = this.eliteFade >= 0.88;

            if (canBurstFire && this.eliteBurstShotTimer <= 0 && this.eliteBurstShotsLeft > 0) {
                this.shoot(ctx);
                this.eliteBurstShotsLeft--;
                const atkSpd = Math.max(0.5, m.attackSpeed ?? 1);
                this.eliteBurstShotTimer = ELITE_BURST_SHOT_GAP / atkSpd;
            }

            if (
                this.eliteBurstShotsLeft <= 0 &&
                this.eliteBurstShotTimer <= 0 &&
                this.eliteFade >= 0.95
            ) {
                this.elitePhase = 'visible';
                this.eliteCycleTimer =
                    ELITE_CYCLE_VISIBLE_MIN +
                    Math.random() * (ELITE_CYCLE_VISIBLE_MAX - ELITE_CYCLE_VISIBLE_MIN);
                this.shootCooldown = 0.5;
            }

            this._applyFadeAlpha();
            return { moveX, moveY, attackOverride: true };
        }

        return this._updateStandard(ctx);
    }

    _updateStandard(ctx) {
        const { px, py, dt = 1 } = ctx;
        const m = this.mob;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        let moveX = 0;
        let moveY = 0;

        if (distToPlayer < this.fleeRange) {
            const dirX = (m.x - px) / distToPlayer;
            const dirY = (m.y - py) / distToPlayer;
            moveX = dirX * m.speed * 1.2;
            moveY = dirY * m.speed * 1.2;
        } else if (distToPlayer > this.shootRange) {
            const dirX = (px - m.x) / distToPlayer;
            const dirY = (py - m.y) / distToPlayer;
            moveX = dirX * m.speed * 0.8;
            moveY = dirY * m.speed * 0.8;
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        const canShoot =
            this.shootCooldown <= 0 &&
            distToPlayer <= this.shootRange &&
            distToPlayer >= this.fleeRange;

        if (canShoot) {
            this.shoot(ctx);
            this.shootCooldown = Math.max(0.25, 1 / m.attackSpeed);
        }

        const isCharging = this.shootCooldown > 0 && this.shootCooldown < 0.4;

        if (m.gl) {
            m.gl.alpha = isCharging ? 0.45 : 0.15;
            m.gl.scale.set(isCharging ? 1.35 : 1);
        }

        return { moveX, moveY, attackOverride: true };
    }

    shoot(ctx) {
        const { px, py, enemyProjs, openWorld } = ctx;
        const m = this.mob;

        let elementalType = 'normal';

        audioManager.playSFX('/sounds/shoot.mp3', 0.1);

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

        const angleOffset =
            m.isElite && this.elitePhase === 'burst'
                ? (Math.random() - 0.5) * 0.22
                : 0;

        const proj = createEnemyProj(
            openWorld.entityLayer,
            m.x,
            m.y,
            px,
            py,
            'enemy_orb',
            m.damage,
            ENEMY_RANGED_ORB_SPEED_SCALE * (m.isElite && this.elitePhase === 'burst' ? 1.15 : 1),
            8,
            angleOffset,
            elementalType
        );

        if (m.isElite && m.eliteType) {
            proj.eliteType = m.eliteType;
        }

        if (enemyProjs) {
            enemyProjs.push(proj);
        }
    }
}
