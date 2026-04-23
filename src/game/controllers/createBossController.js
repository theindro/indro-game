import { Container, Graphics } from 'pixi.js';
import {
    BOSS_HP,
    BOSS_SPEED,
    BOSS_SHOOT_INTERVAL,
    BOSS_RADIUS, BIOME_COLORS
} from '../constants.js';
import { createEnemyProj } from '../projectile.js';
import { resolveVsColliders } from '../collision.js';
import {useGameStore} from "../../stores/gameStore.js";
import {createBossEntity} from "../entities/createBossEntity.js";


/* ── MAIN SPAWN ── */
export function spawnBoss(world, type, x, y, scale = 1) {
    const { c, gl, body, hpBar } = createBossEntity(type);
    c.x = x; c.y = y;
    c.scale.set(scale);
    world.addChild(c);

    const biome   = BIOME_COLORS[type] ?? {};
    const glowCol = biome.glow ?? biome.accent ?? 0x00ccff;
    const maxHp   = BOSS_HP * scale;
    const speed   = BOSS_SPEED * (1 / scale);

    // Create ground attack manager for this boss
    const groundAttacks = new GroundAttackManager(world);

    const boss = {
        c, gl, body, hpBar,
        x, y, type,
        hp: maxHp, maxHp,
        speed,
        radius: BOSS_RADIUS * scale,
        shootTimer: 0,
        shootInterval: BOSS_SHOOT_INTERVAL,
        waveTimer: 0,
        waveInterval: 1000,
        waves: [],
        laserTimer: 0,
        laserInterval: 800,
        lasers: [],
        groundAttackTimer: 0,     // Timer for ground attacks
        groundAttackCircleTimer: 0,     // Timer for ground attacks
        groundAttackInterval: 2000, // How often to do ground attack (3 seconds at 60fps)
        wobble: 0,
        dead: false,
        lastPlayerX: x,
        lastPlayerY: y,
        groundAttacks, // Store reference

        update({ px, py, colliders, roomManager, enemyProjs, playerState, shakeRef, deltaTime = 1 }) {
            if (this.dead) return;

            // Store delta time for animations
            this.lastDeltaTime = deltaTime;
            this.animationTime += deltaTime * 0.05;

            // Store player position for targeting
            this.lastPlayerX = px;
            this.lastPlayerY = py;

            // Update boss animations from entity
            if (this.c.updateAnimations) {
                this.c.updateAnimations(deltaTime);
            }

            // Store original Y for bobbing if not set
            if (this.c.animation && this.c.animation.originalY === undefined) {
                this.c.animation.originalY = this.y;
            }

            // Wobble
            this.wobble += 0.04;
            this.c.scale.set(scale + Math.sin(this.wobble) * 0.03);

            // Movement towards player
            const dx = px - this.x, dy = py - this.y;
            const dist = Math.hypot(dx, dy);
            let nx = this.x, ny = this.y;
            if (dist > 0.01) {
                nx += (dx / dist) * this.speed;
                ny += (dy / dist) * this.speed;
            }
            const clamped  = roomManager.clampToRoom(nx, ny, this.radius);
            const resolved = resolveVsColliders(clamped.x, clamped.y, this.radius, colliders);
            this.x = resolved.x;
            this.y = resolved.y;
            this.c.x = this.x;
            this.c.y = this.y;

            const enraged = this.hp < this.maxHp * 0.4;

            // Projectile shoot (existing)
            this.shootTimer++;
            const shootInterval = enraged ? this.shootInterval * 0.6 : this.shootInterval;
            if (this.shootTimer >= shootInterval) {
                this.shootTimer = 0;
                enemyProjs.push(createEnemyProj(world, this.x, this.y, px, py, this.type, enraged ? 40 : 14, 4.2, 20));
                if (enraged) {
                    [-0.4, 0.4].forEach(off =>
                        enemyProjs.push(createEnemyProj(world, this.x, this.y, px, py, this.type, 10, 2.8, 8, off))
                    );
                }
            }

            // NEW: GROUND ATTACK - Simple circle explosion at player's position
            let groundCircleInterval = 1000;
            this.groundAttackCircleTimer++;

            if (this.groundAttackCircleTimer >= groundCircleInterval) {
                this.groundAttackCircleTimer = 0;
                // EXAMPLE 3: Stationary circle at player position (doesn't follow boss)
                setTimeout(() => {
                    this.groundAttacks.addAttack(px, py, {
                        shape: 'circle',
                        radius: 200,
                        warningDuration: enraged ? 200 : 350,
                        damage: 20,
                        color: glowCol
                        // No anchor - stays at position where player was
                    });

                }, 500)
            }

            this.groundAttackTimer++;
            let groundInterval = this.groundAttackInterval;

            if (this.groundAttackTimer >= groundInterval) {
                this.groundAttackTimer = 0;

                // TEST 1: Simple ground attack at player's position
                /*
                this.groundAttacks.addAttack(this.x, this.y, {
                    shape: 'pizza',
                    radius: 500,
                    angle: Math.atan2(py - this.y, px - this.x), // Initial angle
                    arcAngle: Math.PI / 3, // 60 degree cone
                    warningDuration: 300,
                    damage: 25,
                    color: glowCol,
                    anchor: this,  // Attach to boss
                    trackPlayer: true, // Continuously track player position
                    anchorOffsetX: 0,
                    anchorOffsetY: 0
                });

                // EXAMPLE 2: Line beam that follows boss
                this.groundAttacks.addAttack(this.x, this.y, {
                    shape: 'line',
                    width: 1000,
                    angle: Math.atan2(py - this.y, px - this.x),
                    warningDuration: 350,
                    damage: 30,
                    color: glowCol,
                    anchor: this,
                    trackPlayer: false
                });

                / EXAMPLE 4: 360 degree pizza slices around boss (fixed to boss)
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    this.groundAttacks.addAttack(this.x, this.y, {
                        shape: 'pizza',
                        radius: 500,
                        angle: angle,
                        arcAngle: Math.PI / 2,
                        warningDuration: 450,
                        damage: 18,
                        color: glowCol,
                        anchor: false,  // All slices follow boss
                        trackPlayer: false // Fixed directions, don't track player
                    });
                }
                 */
                // Stagger each slice with increasing delay
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const delay = i * 500; // 0ms, 500ms, 1000ms, 1500ms

                    setTimeout(() => {
                        console.log('boss attack', angle, 'delay:', delay)
                        this.groundAttacks.addAttack(this.x, this.y, {
                            shape: 'pizza',
                            radius: 700,
                            angle: angle,
                            arcAngle: Math.PI / 2,
                            warningDuration: enraged ? 200 : 350,
                            damage: 50,
                            color: glowCol,
                            anchor: false,
                            trackPlayer: false
                        });
                    }, delay);
                }
            }

            // Update all ground attacks
            this.groundAttacks.update(px, py, (damage) => {
                if (playerState) {
                    useGameStore.getState().damagePlayer(damage, 'boss ground attack');
                }
            });

            updateBossBar(this);
        },

        // Add cleanup method for when boss dies
        destroy() {
            if (this.groundAttacks) {
                this.groundAttacks.clear();
            }
        }
    };

    return boss;
}
/* ── HP BAR ── */

export function updateBossBar(b) {
    b.hpBar.clear();

    const p = Math.max(0, b.hp / b.maxHp);

    if (p > 0) {
        const col =
            p > 0.5 ? 0x00ff88 :
                p > 0.25 ? 0xffaa00 :
                    0xff2222;

        b.hpBar.rect(-43, -53, 86 * p, 7).fill(col);
    }
}


export class GroundAttack {
    constructor(world, x, y, config = {}) {
        this.world = world;
        this.g = new Graphics();
        world.addChild(this.g);

        // Position
        this.x = x;
        this.y = y;

        // If anchored to a moving object (like boss)
        this.anchor = config.anchor ?? null;  // Reference to boss or moving object
        this.anchorOffsetX = config.anchorOffsetX ?? 0;
        this.anchorOffsetY = config.anchorOffsetY ?? 0;

        // Attack configuration
        this.config = {
            // Shape: 'circle', 'rectangle', 'pizza' (cone), 'line', 'cross'
            shape: config.shape ?? 'circle',

            // Visuals
            color: config.color ?? 0xff4444,
            warningColor: config.warningColor ?? 0xff0000,
            innerColor: config.innerColor ?? 0xff8888,

            // Size parameters
            radius: config.radius ?? 50,
            width: config.width ?? 100,
            height: config.height ?? 100,
            angle: config.angle ?? 0,
            arcAngle: config.arcAngle ?? Math.PI / 2,
            trackPlayer: config.trackPlayer,

            // Timing
            warningDuration: config.warningDuration ?? 60,

            // Damage
            damage: config.damage ?? 25,

            // Callbacks
            onHit: config.onHit ?? null,
            onComplete: config.onComplete ?? null
        };

        // State
        this.timer = 0;
        this.hasHit = false;
        this.complete = false;
    }

    update(playerX, playerY, onDamageCallback) {
        if (this.complete) return;

        // Update position if anchored to a moving object
        if (this.anchor && !this.anchor.dead) {
            this.x = this.anchor.x + this.anchorOffsetX;
            this.y = this.anchor.y + this.anchorOffsetY;

            // For attacks that should track the player
            if (this.config.trackPlayer && this.anchor.lastPlayerX) {
                // Calculate progress (0 to 1)
                const progress = this.timer / this.config.warningDuration;

                // Only track during first half of warning duration
                const shouldTrack = (progress < 0.5 && !this.hasStoppedTracking);

                if (shouldTrack) {
                    const dx = this.anchor.lastPlayerX - this.anchor.x;
                    const dy = this.anchor.lastPlayerY - this.anchor.y;
                    this.currentAngle = Math.atan2(dy, dx);
                    this.config.angle = this.currentAngle;
                } else if (!this.hasStoppedTracking && progress >= 0.5) {
                    this.hasStoppedTracking = true;
                    // Angle is now locked for the remaining warning time
                }
            }
        }

        this.timer++;
        this.g.clear();

        // Calculate animation progress (0 to 1)
        const progress = Math.min(1, this.timer / this.config.warningDuration);

        // Draw based on shape
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
        if (!this.hasHit && progress >= 0.95) {
            this.hasHit = true;
            if (this._checkHit(playerX, playerY)) {
                if (onDamageCallback) onDamageCallback(this.config.damage);
                if (this.config.onHit) this.config.onHit(playerX, playerY);
            }
        }

        // Attack complete
        if (this.timer >= this.config.warningDuration) {
            this.complete = true;
            if (this.config.onComplete) this.config.onComplete();
        }
    }

    _drawCircle(progress) {
        const R = this.config.radius;
        const waveRadius = R * progress;

        // Static warning circle
        this.g.circle(this.x, this.y, R)
            .stroke({
                color: this.config.warningColor,
                alpha: 0.6 + Math.sin(this.timer * 0.2) * 0.3,
                width: 3
            });

        this.g.circle(this.x, this.y, R - 2)
            .fill({ color: this.config.warningColor, alpha: 0.1 });

        // Expanding wave from center
        this.g.circle(this.x, this.y, waveRadius)
            .stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.circle(this.x, this.y, waveRadius - 3)
            .stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });

        // Particles on wave
        const particleCount = Math.min(12, Math.floor(progress * 20));
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + this.timer * 0.1;
            const x = this.x + Math.cos(angle) * waveRadius;
            const y = this.y + Math.sin(angle) * waveRadius;
            this.g.circle(x, y, 2).fill({ color: this.config.color, alpha: 0.8 });
        }
    }

    _drawRectangle(progress) {
        const w = this.config.width;
        const h = this.config.height;
        const waveProgress = progress;

        // Static warning rectangle
        this.g.rect(this.x - w/2, this.y - h/2, w, h)
            .stroke({
                color: this.config.warningColor,
                alpha: 0.6 + Math.sin(this.timer * 0.2) * 0.3,
                width: 3
            });

        this.g.rect(this.x - w/2 + 2, this.y - h/2 + 2, w - 4, h - 4)
            .fill({ color: this.config.warningColor, alpha: 0.1 });

        // Wave expands from center outward
        const borderOffset = Math.min(w/2, h/2) * waveProgress;

        this.g.rect(
            this.x - w/2 + borderOffset,
            this.y - h/2 + borderOffset,
            w - borderOffset * 2,
            h - borderOffset * 2
        ).stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.rect(
            this.x - w/2 + borderOffset + 2,
            this.y - h/2 + borderOffset + 2,
            w - borderOffset * 2 - 4,
            h - borderOffset * 2 - 4
        ).stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });

        // Corner particles
        const corners = [
            [-w/2 + borderOffset, -h/2 + borderOffset],
            [ w/2 - borderOffset, -h/2 + borderOffset],
            [-w/2 + borderOffset,  h/2 - borderOffset],
            [ w/2 - borderOffset,  h/2 - borderOffset]
        ];
        corners.forEach(([cx, cy]) => {
            this.g.circle(this.x + cx, this.y + cy, 3)
                .fill({ color: this.config.color, alpha: 0.8 });
        });
    }

    _drawPizza(progress) {
        const R = this.config.radius;
        const angle = this.config.angle;
        const arcAngle = this.config.arcAngle;
        const startAngle = angle - arcAngle/2;
        const endAngle = angle + arcAngle/2;

        // Draw static warning cone
        this.g.moveTo(this.x, this.y);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            const x = this.x + Math.cos(a) * R;
            const y = this.y + Math.sin(a) * R;
            this.g.lineTo(x, y);
        }
        this.g.closePath();
        this.g.stroke({ color: this.config.warningColor, alpha: 0.6, width: 3 });
        this.g.fill({ color: this.config.warningColor, alpha: 0.1 });

        // Wave expands from center outward
        const waveRadius = R * progress;

        // Draw wave arc
        this.g.moveTo(this.x, this.y);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            const x = this.x + Math.cos(a) * waveRadius;
            const y = this.y + Math.sin(a) * waveRadius;
            this.g.lineTo(x, y);
        }
        this.g.closePath();
        this.g.stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        // Inner glow
        this.g.moveTo(this.x, this.y);
        for (let a = startAngle; a <= endAngle; a += 0.05) {
            const x = this.x + Math.cos(a) * (waveRadius - 3);
            const y = this.y + Math.sin(a) * (waveRadius - 3);
            this.g.lineTo(x, y);
        }
        this.g.closePath();
        this.g.stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });

        // Particles along the wave
        const particleCount = Math.min(8, Math.floor(progress * 15));
        for (let i = 0; i <= particleCount; i++) {
            const a = startAngle + (endAngle - startAngle) * (i / particleCount);
            const x = this.x + Math.cos(a) * waveRadius;
            const y = this.y + Math.sin(a) * waveRadius;
            this.g.circle(x, y, 2).fill({ color: this.config.color, alpha: 0.8 });
        }
    }

    _drawLine(progress) {
        const w = this.config.width;
        const angle = this.config.angle;
        const halfLength = w / 2;

        const startX = this.x - Math.cos(angle) * halfLength;
        const startY = this.y - Math.sin(angle) * halfLength;
        const endX = this.x + Math.cos(angle) * halfLength;
        const endY = this.y + Math.sin(angle) * halfLength;

        // Static warning line
        this.g.moveTo(startX, startY).lineTo(endX, endY)
            .stroke({ color: this.config.warningColor, alpha: 0.6, width: 8 });

        // Wave expands from center outward
        const waveOffset = halfLength * progress;
        const waveStartX = this.x - Math.cos(angle) * waveOffset;
        const waveStartY = this.y - Math.sin(angle) * waveOffset;
        const waveEndX = this.x + Math.cos(angle) * waveOffset;
        const waveEndY = this.y + Math.sin(angle) * waveOffset;

        this.g.moveTo(waveStartX, waveStartY).lineTo(waveEndX, waveEndY)
            .stroke({ color: this.config.color, alpha: 0.9, width: 6 });

        this.g.moveTo(waveStartX, waveStartY).lineTo(waveEndX, waveEndY)
            .stroke({ color: this.config.innerColor, alpha: 0.7, width: 2 });

        this.g.circle(waveEndX, waveEndY, 4)
            .fill({ color: this.config.color, alpha: 0.9 });
        this.g.circle(waveStartX, waveStartY, 4)
            .fill({ color: this.config.color, alpha: 0.9 });
    }

    _drawCross(progress) {
        const w = this.config.width;
        const h = this.config.height;
        const waveProgress = progress;

        // Static warning cross
        this.g.rect(this.x - w/2, this.y - 15, w, 30)
            .stroke({ color: this.config.warningColor, alpha: 0.6, width: 3 });
        this.g.rect(this.x - 15, this.y - h/2, 30, h)
            .stroke({ color: this.config.warningColor, alpha: 0.6, width: 3 });

        this.g.rect(this.x - w/2 + 2, this.y - 13, w - 4, 26)
            .fill({ color: this.config.warningColor, alpha: 0.1 });
        this.g.rect(this.x - 13, this.y - h/2 + 2, 26, h - 4)
            .fill({ color: this.config.warningColor, alpha: 0.1 });

        // Wave expands from center outward
        const borderOffset = Math.min(w/2, h/2) * waveProgress;

        this.g.rect(
            this.x - w/2 + borderOffset,
            this.y - 15 + borderOffset * 0.3,
            w - borderOffset * 2,
            30 - borderOffset * 0.6
        ).stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.rect(
            this.x - 15 + borderOffset * 0.3,
            this.y - h/2 + borderOffset,
            30 - borderOffset * 0.6,
            h - borderOffset * 2
        ).stroke({ color: this.config.color, alpha: 0.9, width: 4 });

        this.g.circle(this.x, this.y, 5)
            .fill({ color: this.config.color, alpha: 0.9 });
    }

    _checkHit(px, py) {
        switch(this.config.shape) {
            case 'circle': {
                const dist = Math.hypot(px - this.x, py - this.y);
                return dist <= this.config.radius;
            }
            case 'rectangle': {
                const halfW = this.config.width / 2;
                const halfH = this.config.height / 2;
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
                return dist <= 15;
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
        if (this.g) {
            this.world.removeChild(this.g);
            this.g.destroy();
        }
    }
}

export class GroundAttackManager {
    constructor(world) {
        this.world = world;
        this.attacks = [];
    }

    addAttack(x, y, config = {}) {
        const attack = new GroundAttack(this.world, x, y, config);
        this.attacks.push(attack);
        return attack;
    }

    update(playerX, playerY, onDamage) {
        for (let i = this.attacks.length - 1; i >= 0; i--) {
            const attack = this.attacks[i];
            attack.update(playerX, playerY, onDamage);

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
    }
}