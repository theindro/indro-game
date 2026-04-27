import { Container, Graphics } from 'pixi.js';
import {
    BOSS_HP,
    BOSS_SPEED,
    BOSS_SHOOT_INTERVAL,
    BOSS_RADIUS, BIOME_COLORS
} from '../constants.js';
import { createEnemyProj } from './createProjectileController.js';
import { resolveVsColliders } from '../world/collision.js';
import {useGameStore} from "../../stores/gameStore.js";
import {createBossEntity} from "../entities/createBossEntity.js";
import {GroundAttackController} from "./createGroundAttackController.js";
import {updateStatusEffects} from "../statusEffects.js";

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
    const groundAttacks = new GroundAttackController(world);

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


        update({ px, py, colliders, openWorld, enemyProjs, playerState, deltaTime = 1 }) {
            if (this.dead) return;

            // Every tick update status effect on boss
            updateStatusEffects(this, deltaTime, performance.now(), (damage, type) => {
                // Optional callback for damage ticks
            });

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
            const clamped  = openWorld.clampToWorld(nx, ny, this.radius);
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
                enemyProjs.push(createEnemyProj(openWorld.entityLayer, this.x, this.y, px, py, this.type, enraged ? 40 : 14, 4.2, 20));
                if (enraged) {
                    [-0.4, 0.4].forEach(off =>
                        enemyProjs.push(createEnemyProj(openWorld.entityLayer, this.x, this.y, px, py, this.type, 10, 2.8, 8, off))
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

    groundAttacks.owner = boss;

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
