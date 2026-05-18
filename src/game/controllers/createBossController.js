import { Container, Graphics } from 'pixi.js';
import {
    BOSS_SHOOT_INTERVAL,
    BOSS_RADIUS,
    BIOME_COLORS,
    frameScale,
    GROUND_WARN_FAST,
    GROUND_WARN_NORMAL,
    GROUND_WARN_SLOW,
} from '../constants.js';
import { applyBossDifficulty, scaleBossDamage } from '../difficultyScaling.js';
import { createEnemyProj } from './createProjectileController.js';
import { resolveVsColliders } from '../world/collision.js';
import {useGameStore} from "../../stores/gameStore.js";
import {createBossEntity} from "../entities/createBossEntity.js";
import {GroundAttackController, resolveGroundAttackPalette} from "./createGroundAttackController.js";
import {updateStatusEffects} from "../statusEffects.js";
import { applyEntityOutlineFilter } from '../utils/highlightFilters.js';
import { attachMonsterLevelUi, drawMonsterHpWithLevel } from '../ui/monsterLevelUi.js';
import { getWorldContentScales } from '../world/worldProgression.js';

const BOSS_AGGRO_RADIUS = 520;
const BOSS_LEASH_RADIUS = 720;
const BOSS_HOME_RADIUS = 36;

const GROUND_PATTERN_INTERVAL = 360;
const GROUND_PATTERN_INTERVAL_ENRAGED = 260;
const GROUND_CIRCLE_INTERVAL = 1100;
const GROUND_CIRCLE_INTERVAL_ENRAGED = 750;

/** @typedef {(boss: object, px: number, py: number, groundFx: object, enraged: boolean) => void} BossGroundPattern */

/** @type {BossGroundPattern[]} */
const BOSS_GROUND_PATTERNS = [
    patternRadialSlices,
    patternTrackingCone,
    patternLineBeam,
    patternCrossSlam,
    patternOrbitCircles,
    patternRectSlam,
];

function scheduleGroundAttack(boss, delayMs, fn) {
    const id = setTimeout(() => {
        if (boss.dead || !boss.groundAttacks?.active) return;
        fn(boss);
    }, delayMs);
    (boss._groundTimeouts ??= []).push(id);
}

/** @type {BossGroundPattern} */
function patternRadialSlices(boss, _px, _py, groundFx, enraged) {
    const count = enraged ? 6 : 4;
    const stagger = enraged ? 320 : 480;
    const radius = enraged ? 620 : 520;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        scheduleGroundAttack(boss, i * stagger, (b) => {
            b.groundAttacks.addAttack(b.x, b.y, {
                shape: 'pizza',
                radius,
                angle,
                arcAngle: Math.PI / 2,
                warningDuration: enraged ? GROUND_WARN_FAST : GROUND_WARN_SLOW,
                damage: scaleBossDamage(enraged ? 45 : 35, boss.damageScale),
                ...groundFx,
            });
        });
    }
}

/** @type {BossGroundPattern} */
function patternTrackingCone(boss, px, py, groundFx, enraged) {
    const angle = Math.atan2(py - boss.y, px - boss.x);
    boss.groundAttacks.addAttack(boss.x, boss.y, {
        shape: 'pizza',
        radius: enraged ? 500 : 420,
        angle,
        arcAngle: Math.PI / 3,
        warningDuration: enraged ? GROUND_WARN_FAST : GROUND_WARN_NORMAL,
        damage: scaleBossDamage(enraged ? 40 : 30, boss.damageScale),
        anchor: boss,
        trackPlayer: true,
        ...groundFx,
    });
}

/** @type {BossGroundPattern} */
function patternLineBeam(boss, px, py, groundFx, enraged) {
    const angle = Math.atan2(py - boss.y, px - boss.x);
    boss.groundAttacks.addAttack(boss.x, boss.y, {
        shape: 'line',
        width: enraged ? 1100 : 900,
        angle,
        warningDuration: enraged ? GROUND_WARN_FAST : GROUND_WARN_NORMAL,
        damage: scaleBossDamage(enraged ? 35 : 25, boss.damageScale),
        hitboxRadius: 22,
        ...groundFx,
    });

    if (enraged) {
        scheduleGroundAttack(boss, 400, (b) => {
            const a = angle + Math.PI / 2;
            b.groundAttacks.addAttack(b.x, b.y, {
                shape: 'line',
                width: 900,
                angle: a,
                warningDuration: GROUND_WARN_FAST,
                damage: scaleBossDamage(28, b.damageScale),
                hitboxRadius: 20,
                ...groundFx,
            });
        });
    }
}

/** @type {BossGroundPattern} */
function patternCrossSlam(boss, px, py, groundFx, enraged) {
    const size = enraged ? 480 : 380;
    boss.groundAttacks.addAttack(px, py, {
        shape: 'cross',
        width: size,
        height: size,
        warningDuration: enraged ? GROUND_WARN_NORMAL : GROUND_WARN_SLOW,
        damage: scaleBossDamage(enraged ? 38 : 28, boss.damageScale),
        ...groundFx,
    });
}

/** @type {BossGroundPattern} */
function patternOrbitCircles(boss, _px, _py, groundFx, enraged) {
    const count = enraged ? 8 : 6;
    const dist = enraged ? 300 : 240;
    const hitR = enraged ? 130 : 105;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        scheduleGroundAttack(boss, i * 130, (b) => {
            b.groundAttacks.addAttack(
                b.x + Math.cos(angle) * dist,
                b.y + Math.sin(angle) * dist,
                {
                    shape: 'circle',
                    radius: hitR,
                    warningDuration: GROUND_WARN_FAST,
                    damage: scaleBossDamage(enraged ? 22 : 16, b.damageScale),
                    ...groundFx,
                }
            );
        });
    }
}

/** @type {BossGroundPattern} */
function patternRectSlam(boss, px, py, groundFx, enraged) {
    boss.groundAttacks.addAttack(px, py, {
        shape: 'rectangle',
        width: enraged ? 440 : 360,
        height: enraged ? 440 : 360,
        warningDuration: enraged ? GROUND_WARN_NORMAL : GROUND_WARN_SLOW,
        damage: scaleBossDamage(enraged ? 32 : 24, boss.damageScale),
        ...groundFx,
    });
}

/** @type {BossGroundPattern} */
function patternPlayerCircle(boss, px, py, groundFx, enraged) {
    scheduleGroundAttack(boss, 380, (b) => {
        b.groundAttacks.addAttack(px, py, {
            shape: 'circle',
            radius: enraged ? 220 : 185,
            warningDuration: enraged ? GROUND_WARN_FAST : GROUND_WARN_NORMAL,
            damage: scaleBossDamage(enraged ? 28 : 20, b.damageScale),
            ...groundFx,
        });
    });
}

function runBossGroundPattern(boss, px, py, groundFx, enraged) {
    const pattern = BOSS_GROUND_PATTERNS[boss.groundPatternIndex % BOSS_GROUND_PATTERNS.length];
    boss.groundPatternIndex += 1;
    pattern(boss, px, py, groundFx, enraged);
}

/* ── MAIN SPAWN ── */
export function spawnBoss(world, type, x, y, visualScale = 1, difficulty = 1) {
    const { c, bodyC, uiC, gl, body, hpBar } = createBossEntity(type);
    c.x = x;
    c.y = y;
    bodyC.scale.set(visualScale);
    world.addChild(c);

    const biome   = BIOME_COLORS[type] ?? {};
    const glowCol = biome.glow ?? biome.accent ?? 0x00ccff;
    const groundFx = resolveGroundAttackPalette(glowCol);
    const scaled  = applyBossDifficulty(difficulty, visualScale);
    const maxHp   = scaled.maxHp;
    const speed   = scaled.speed;

    // Create ground attack manager for this boss
    const groundAttacks = new GroundAttackController(world);

    const spawnCenterX = x;
    const spawnCenterY = y;
    let state = 'GUARD';

    const boss = {
        c, bodyC, uiC, gl, body, hpBar,
        x, y, type,
        spawnCenterX,
        spawnCenterY,
        hp: maxHp, maxHp,
        speed,
        radius: BOSS_RADIUS * visualScale,
        damageScale: scaled.damageScale,
        attackSpeedMul: scaled.attackSpeedMul,
        difficulty: scaled.difficulty,
        shootTimer: 0,
        shootInterval: BOSS_SHOOT_INTERVAL,
        waveTimer: 0,
        waveInterval: 100,
        waves: [],
        laserTimer: 0,
        laserInterval: 180,
        lasers: [],
        groundAttackTimer: 0,
        groundAttackCircleTimer: 0,
        groundPatternIndex: 0,
        _groundTimeouts: [],
        wobble: 0,
        dead: false,
        lastPlayerX: x,
        lastPlayerY: y,
        groundAttacks, // Store reference


        update({ px, py, colliders, openWorld, enemyProjs, playerState, dt }) {
            if (this.dead) return;

            const fs = frameScale(dt);

            // Use the boss's Y position as zIndex for proper depth sorting
            this.c.zIndex = this.y;  // ← THIS IS THE FIX
            this.zIndex = this.y;

            // Every tick update status effect on boss
            updateStatusEffects(this, dt, performance.now(), (damage, type) => {
                // Optional callback for damage ticks
            });

            // Store delta time for animations
            this.lastDeltaTime = dt;
            this.animationTime += dt * 3; // matched old ~0.05 per 60fps frame

            // Store player position for targeting
            this.lastPlayerX = px;
            this.lastPlayerY = py;

            // Update boss animations from entity
            if (this.c.updateAnimations) {
                this.c.updateAnimations(fs);
            }

            // Wobble (body only — HP bar stays stable)
            this.wobble += 0.04 * fs;
            const wobbleScale = visualScale + Math.sin(this.wobble) * 0.03;
            if (this.bodyC) {
                this.bodyC.scale.set(wobbleScale);
            }

            const dxPlayer = px - this.x;
            const dyPlayer = py - this.y;
            const distToPlayer = Math.hypot(dxPlayer, dyPlayer);

            const dxHome = spawnCenterX - this.x;
            const dyHome = spawnCenterY - this.y;
            const distHome = Math.hypot(dxHome, dyHome);

            if (state === 'GUARD' && distToPlayer < BOSS_AGGRO_RADIUS) {
                state = 'CHASE';
            }
            if (state === 'CHASE' && distToPlayer > BOSS_LEASH_RADIUS) {
                state = 'RETURN';
            }
            if (state === 'RETURN' && distHome < BOSS_HOME_RADIUS) {
                state = 'GUARD';
            }
            if (state === 'RETURN' && distToPlayer < BOSS_AGGRO_RADIUS * 0.9) {
                state = 'CHASE';
            }

            let moveX = 0;
            let moveY = 0;

            if (state === 'CHASE') {
                const len = distToPlayer || 1;
                moveX = (dxPlayer / len) * this.speed;
                moveY = (dyPlayer / len) * this.speed;
            } else if (state === 'RETURN' || state === 'GUARD') {
                if (distHome > BOSS_HOME_RADIUS) {
                    const len = distHome || 1;
                    const homeSpeed = state === 'RETURN' ? this.speed * 0.85 : this.speed * 0.35;
                    moveX = (dxHome / len) * homeSpeed;
                    moveY = (dyHome / len) * homeSpeed;
                }
            }

            let nx = this.x;
            let ny = this.y;
            if (moveX !== 0 || moveY !== 0) {
                nx += moveX * fs;
                ny += moveY * fs;
            }

            const clamped = openWorld.clampToWorld(nx, ny, this.radius);
            const resolved = resolveVsColliders(clamped.x, clamped.y, this.radius, colliders);
            this.x = resolved.x;
            this.y = resolved.y;
            this.c.x = this.x;
            this.c.y = this.y;

            const enraged = this.hp < this.maxHp * 0.4;
            const isChasing = state === 'CHASE';

            // Projectile shoot — only while chasing the player
            this.shootTimer += fs;
            const atkMul = this.attackSpeedMul ?? 1;
            const shootInterval = (enraged ? this.shootInterval * 0.6 : this.shootInterval) / atkMul;
            if (isChasing && this.shootTimer >= shootInterval) {
                this.shootTimer = 0;
                const mainDmg = scaleBossDamage(enraged ? 40 : 14, this.damageScale);
                const sideDmg = scaleBossDamage(10, this.damageScale);
                enemyProjs.push(createEnemyProj(openWorld.entityLayer, this.x, this.y, px, py, this.type, mainDmg, 4.2, 20));
                if (enraged) {
                    [-0.4, 0.4].forEach(off =>
                        enemyProjs.push(createEnemyProj(openWorld.entityLayer, this.x, this.y, px, py, this.type, sideDmg, 2.8, 8, off))
                    );
                }
            }

            this.groundAttackCircleTimer += fs;
            const circleInterval = (enraged ? GROUND_CIRCLE_INTERVAL_ENRAGED : GROUND_CIRCLE_INTERVAL) / atkMul;
            if (isChasing && this.groundAttackCircleTimer >= circleInterval) {
                this.groundAttackCircleTimer = 0;
                patternPlayerCircle(this, px, py, groundFx, enraged);
            }

            this.groundAttackTimer += fs;
            const patternInterval = (enraged ? GROUND_PATTERN_INTERVAL_ENRAGED : GROUND_PATTERN_INTERVAL) / atkMul;
            if (isChasing && this.groundAttackTimer >= patternInterval) {
                this.groundAttackTimer = 0;
                runBossGroundPattern(this, px, py, groundFx, enraged);
            }

            // Update all ground attacks
            this.groundAttacks.update(px, py, (damage) => {
                if (playerState) {
                    useGameStore.getState().damagePlayer(damage, 'boss ground attack');
                }
            }, dt);

            applyEntityOutlineFilter(this.body, this, state === 'CHASE');
            updateBossBar(this);
        },

        getState: () => state,
        isAggro: () => state === 'CHASE',

        destroy() {
            for (const id of this._groundTimeouts ?? []) {
                clearTimeout(id);
            }
            this._groundTimeouts = [];
            if (this.groundAttacks) {
                this.groundAttacks.clear();
            }
        },
    };

    groundAttacks.owner = boss;

    boss.lootMultiplier = getWorldContentScales(scaled.difficulty).lootMultiplier;

    attachMonsterLevelUi(boss, scaled.difficulty, {
        barHalfWidth: 43,
        barY: -53,
        barHeight: 7,
    });

    return boss;
}
/* ── HP BAR ── */

export function updateBossBar(b) {
    const p = Math.max(0, b.hp / b.maxHp);

    if (b.levelUi) {
        drawMonsterHpWithLevel(b, p);
        return;
    }

    b.hpBar.clear();

    if (p > 0) {
        const col =
            p > 0.5 ? 0x00ff88 :
                p > 0.25 ? 0xffaa00 :
                    0xff2222;

        b.hpBar.rect(-43, -53, 86 * p, 7).fill(col);
    }
}
