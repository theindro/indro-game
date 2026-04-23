import { Container, Graphics } from 'pixi.js';
import { getBiome } from './biome.js';
import { MOB_HP, MOB_SAFE_RADIUS, DIFFICULTY, BIOME_COLORS, MOB_RADIUS, ICE_MOB_SHOOT_INTERVAL_BASE, GS } from './constants.js';
import { resolveVsColliders } from "./collision.js";
import { createEnemyProj } from "./projectile.js";
import {useGameStore} from "../stores/gameStore.js";

/* ── visual factory ── */

export function makeMobBody(biome, size = 13) {
    const c = new Container();
    const biomeData = BIOME_COLORS[biome] || {};

    const sh = new Graphics();
    sh.ellipse(0, size + 1, size, 4).fill({ color: 0, alpha: 0.22 });
    c.addChild(sh);

    const glCol = biomeData.glow ?? biomeData.accent ?? 0xff1654;
    const gl = new Graphics();
    gl.circle(0, 0, size + 7).fill({ color: glCol, alpha: 0.15 });
    c.addChild(gl);

    const body = new Graphics();
    const baseCol   = biomeData.accent  ?? 0xc9184a;
    const shineCol  = biomeData.glow    ?? 0xff6b8a;
    const detailCol = biomeData.obsidian ?? biomeData.base ?? 0x333333;

    body.circle(0, 0, size).fill(baseCol);
    body.circle(-4, -4, 5).fill({ color: shineCol, alpha: 0.38 });

    if (biome === 'ice') {
        body.moveTo(-5, -size - 3).lineTo(-2, -size + 5).lineTo(-8, -size + 5).closePath().fill(shineCol);
        body.moveTo(5,  -size - 3).lineTo(8,  -size + 5).lineTo(2,  -size + 5).closePath().fill(shineCol);
    } else if (biome === 'lava') {
        const magma = biomeData.magma ?? 0xff6600;
        body.moveTo(-size + 2, 2).lineTo(-size + 8, -2).lineTo(-size + 6, 6).closePath()
            .fill({ color: magma, alpha: 0.7 });
        body.moveTo(4, -size + 4).lineTo(8, -size + 8).lineTo(2, -size + 8).closePath()
            .fill({ color: magma, alpha: 0.7 });
    } else if (biome === 'desert') {
        body.rect(size - 2, -3, 8, 5).fill(detailCol);
        body.moveTo(size + 6, -3).lineTo(size + 10, -9).lineTo(size + 8, -3).closePath()
            .fill(biomeData.glow ?? 0xff5500);
    }

    c.addChild(body);

    const eye = new Graphics();
    eye.circle(3, -3, 4).fill(0);
    eye.circle(4, -4, 2).fill(glCol);
    eye.circle(5, -5, 0.8).fill({ color: 0xffffff, alpha: 0.7 });
    c.addChild(eye);

    const hpBg = new Graphics();
    hpBg.rect(-size - 3, -size - 14, size * 2 + 6, 5).fill({ color: 0x111111, alpha: 0.8 });
    c.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-size - 2, -size - 13, size * 2 + 4, 3).fill(0xff4444);
    c.addChild(hpBar);

    return { c, body, gl, hpBar };
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

/* ── CREATE MOB CONTROLLER (defined before spawn functions) ── */

export function createMobController(mob) {
    let shootTimer = 0;

    return {
        mob,

        update(ctx) {
            if (!mob || !mob.c) return;

            const {
                px,
                py,
                colliders,
                roomManager,
                enemyProjs,
                playerState,
                shakeRef,
                mobs,
                world
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

            if (colliders) {
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
            if (mobs) {
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

/* ── spawn helper with bounce animation AND controller attached ── */

export function spawnMob(world, x, y, biome = null) {
    const finalBiome = biome || getBiome(x, y) || 'forest';
    const { c, body, gl, hpBar } = makeMobBody(finalBiome, 13);

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

export function spawnMobWithBounce(world, x, y, biome = null) {
    const mob = spawnMob(world, x, y, biome);

    mob.bounceAmplitude = 8;
    mob.bounceSpeed = 0.15;
    mob.bounceTime = -Math.PI / 2;

    setTimeout(() => {
        if (mob.bounceAmplitude > 4) {
            mob.bounceAmplitude = 2 + Math.random() * 2;
        }
    }, 500);

    return mob;
}

export function spawnInitialMobs(world, count) {
    const result = [];
    for (let i = 0; i < count; i++) {
        let mx, my, t = 0;
        do {
            mx = (Math.random() - 0.5) * 1800;
            my = (Math.random() - 0.5) * 1800;
            t++;
        } while (t < 20 && Math.sqrt(mx * mx + my * my) < MOB_SAFE_RADIUS);
        result.push(spawnMobWithBounce(world, mx, my));
    }
    return result;
}