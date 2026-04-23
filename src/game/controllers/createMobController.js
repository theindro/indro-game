import {DIFFICULTY, GS, ICE_MOB_SHOOT_INTERVAL_BASE, MOB_HP, MOB_RADIUS} from "../constants.js";
import {resolveVsColliders} from "../collision.js";
import {useGameStore} from "../../stores/gameStore.js";
import {createEnemyProj} from "../projectile.js";
import {getBiome} from "../biome.js";
import {createMobEntity} from "../entities/createMobEntity.js";

export function createMobController(mob) {
    let shootTimer = 0;

    return {
        mob,

        update(ctx) {
            if (!mob || !mob.c) return;

            // Destructure the context that's actually being passed from game.js
            const {
                px, py,           // Player position
                colliders,        // Collision objects
                roomManager,      // Room management
                enemyProjs,       // Enemy projectiles array
                playerState,      // Player state from store
                shakeRef,         // Screen shake reference
                mobs,            // All mobs array
                world            // World container
            } = ctx;

            const m = this.mob;

            // ── movement ──
            const dx = px - m.x;
            const dy = py - m.y;
            const dist = Math.hypot(dx, dy);

            let mx = 0;
            let my = 0;

            if (dist > 0.01) {
                mx = dx / dist;
                my = dy / dist;
            }

            // collider separation
            const SEP_RADIUS = 100;
            const SEP_FORCE = 2.2;

            if (colliders && colliders.length) {
                for (const col of colliders) {
                    const cdx = m.x - col.x;
                    const cdy = m.y - col.y;
                    const cd = Math.hypot(cdx, cdy);
                    const minD = MOB_RADIUS + (col.r || 0) + SEP_RADIUS;
                    if (cd < minD && cd > 0.001) {
                        const strength = (1 - cd / minD) * SEP_FORCE;
                        mx += (cdx / cd) * strength;
                        my += (cdy / cd) * strength;
                    }
                }
            }

            // mob separation
            if (mobs && mobs.length) {
                for (const o of mobs) {
                    if (o === m) continue;
                    const odx = m.x - o.x;
                    const ody = m.y - o.y;
                    const od = Math.hypot(odx, ody);
                    const minO = MOB_RADIUS * 2 + 4;
                    if (od < minO && od > 0.001) {
                        const strength = (1 - od / minO) * 1.2;
                        mx += (odx / od) * strength;
                        my += (ody / od) * strength;
                    }
                }
            }

            const len = Math.hypot(mx, my);
            if (len > 0.001) {
                mx = (mx / len) * m.speed * GS;
                my = (my / len) * m.speed * GS;
            }

            let nx = m.x + mx;
            let ny = m.y + my;

            if (roomManager) {
                const clamped = roomManager.clampToRoom(nx, ny, MOB_RADIUS);
                const resolved = resolveVsColliders(
                    clamped.x,
                    clamped.y,
                    MOB_RADIUS,
                    colliders || []
                );
                m.x = resolved.x;
                m.y = resolved.y;
            } else {
                m.x = nx;
                m.y = ny;
            }

            m.c.x = m.x;
            m.c.y = m.y;

            // contact damage
            if (dist < 26 && playerState) {
                if (m.attackCooldown <= 0) {
                    useGameStore.getState().damagePlayer(2, 'mob atk');
                    m.attackCooldown = 60; // 60fps → 12 ticks ≈ 5 hits/sec
                }
            }

            // reduce cooldown every frame
            if (m.attackCooldown > 0) {
                m.attackCooldown--;
            }

            // shooting
            shootTimer++;
            if (
                m.biome === 'ice' &&
                dist > 90 &&
                dist < 380 &&
                shootTimer > ICE_MOB_SHOOT_INTERVAL_BASE &&
                world &&
                enemyProjs
            ) {
                shootTimer = 0;
                enemyProjs.push(
                    createEnemyProj(world, m.x, m.y, px, py, 'ice', 5, 2.5, 6)
                );
            }

            updateMobBar(m, 13);
        }
    };
}

export function spawnMob(world, x, y, biome = null) {
    const finalBiome = biome || getBiome(x, y) || 'forest';
    const { c, body, gl, hpBar } = createMobEntity(finalBiome, 13);

    c.x = x;
    c.y = y;
    world.addChild(c);

    const baseHp = MOB_HP * DIFFICULTY.mobHp;
    const baseSpeed = 0.78 * DIFFICULTY.mobSpeed;

    const mob = {
        c,
        body,
        gl,
        hpBar,
        x,
        y,
        hp: baseHp,
        maxHp: baseHp,
        speed: baseSpeed + Math.random() * 0.4 * DIFFICULTY.mobSpeed,
        hitFlash: 0,
        biome: finalBiome,
        shootTimer: 0,
        bounceSpeed: 0.08 + Math.random() * 0.04,
        bounceTime: Math.random() * Math.PI * 2,
        originalY: y,
        bounceAmplitude: 2 + Math.random() * 2,
        scalePulse: 0,
        attackCooldown: 1,
    };

    // 🔴 CRITICAL FIX: Attach the controller to the mob
    mob.controller = createMobController(mob);

    return mob;
}


export function updateMobBar(m, size = 13) {
    if (!m || !m.hpBar) return;
    const pct = Math.max(0, m.hp / m.maxHp);
    m.hpBar.clear();
    if (pct > 0) {
        const col = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        m.hpBar.rect(-size - 2, -size - 13, (size * 2 + 4) * pct, 3).fill(col);
    }
}

export function updateMobBounceAnimation(mobs, deltaTime = 1) {
    for (const mob of mobs) {
        if (!mob || !mob.c) continue;

        mob.bounceTime += mob.bounceSpeed * deltaTime;
        const bounceOffset = Math.sin(mob.bounceTime) * mob.bounceAmplitude;
        mob.c.y = mob.y + bounceOffset;

        const squashScale = 1 + Math.abs(Math.sin(mob.bounceTime)) * 0.08;
        const stretchScale = 1 - Math.abs(Math.sin(mob.bounceTime)) * 0.05;

        if (Math.sin(mob.bounceTime) > 0) {
            mob.c.scale.y = stretchScale;
            mob.c.scale.x = 1 + (1 - stretchScale) * 0.5;
        } else {
            mob.c.scale.y = squashScale;
            mob.c.scale.x = 1 - (squashScale - 1) * 0.5;
        }

        if (mob.hitFlash > 0) {
            mob.hitFlash -= 0.05 * deltaTime;
            const flashIntensity = Math.min(1, mob.hitFlash);
            if (mob.body) {
                mob.body.tint = 0xffffff;
                mob.body.alpha = 0.5 + flashIntensity * 0.5;
            }
        } else if (mob.body && mob.body.tint !== 0xffffff) {
            mob.body.tint = 0xffffff;
            mob.body.alpha = 1;
        }
    }
}
