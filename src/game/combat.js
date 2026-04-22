import { createArrow, createEnemyProj } from './projectile.js';
import { spawnDrops } from './drops.js';
import { burst } from './particles.js';
import { showFloat } from './floatText.js';
import { hideBossPanel } from './hud.js';
import {BOSS_RADIUS, XP_PER_MOB, XP_PER_BOSS, HEART_COLOR, BIOME_COLORS} from './constants.js';

/**
 * @param {object} ctx - shared references passed in once at setup
 * @param {import('pixi.js').Container} ctx.world
 * @param {object} ctx.entities        - { mobs, bosses, arrows, enemyProjs, drops }
 * @param {object} ctx.particles
 * @param {object} ctx.floats
 * @param {object} ctx.playerState     - { pHP, pMaxHP, stats, ... }
 * @param {object} ctx.shakeRef        - { value }
 * @param {object} ctx.hudElements
 * @param {object} ctx.killsRef        - { value }
 * @param {object} ctx.bossActiveRef   - { value }
 * @param {object} ctx.xp              - { addXP }
 * @param {object} ctx.roomManager
 */
export function createCombatSystem(ctx) {
    const {
        world, entities, particles, floats,
        playerState, shakeRef, hudElements,
        killsRef, bossActiveRef, xp, roomManager
    } = ctx;

    const { mobs, bosses, arrows, enemyProjs, drops } = entities;

    // ─────────────────────────────
    // Shooting
    // ─────────────────────────────
    function tryShoot(px, py, tx, ty) {
        const { stats } = playerState;
        for (let i = 0; i < stats.projectiles; i++) {
            const spread = (i - (stats.projectiles - 1) / 2) * 0.12;
            arrows.push(createArrow(world, px, py, tx, ty, spread));
        }
    }

    // ─────────────────────────────
    // Arrows
    // ─────────────────────────────
    function updateArrows(px, py) {
        const { stats } = playerState;

        for (let ai = arrows.length - 1; ai >= 0; ai--) {
            const a = arrows[ai];
            a.c.x += a.vx;
            a.c.y += a.vy;
            a.life--;

            if (a.life <= 0 || !roomManager.isInsideRoom(a.c.x, a.c.y)) {
                world.removeChild(a.c);
                arrows.splice(ai, 1);
                continue;
            }

            let hit = false;

            // vs mobs
// vs mobs
            for (let mi = mobs.length - 1; mi >= 0; mi--) {
                const m = mobs[mi];
                if (Math.hypot(m.x - a.c.x, m.y - a.c.y) >= 16) continue;

                const dmg = stats.damage + Math.floor(Math.random() * 6);
                m.hp -= dmg;
                burst(world, particles, m.x, m.y, 0xff4466, 7);
                showFloat(floats, m.x, m.y - 20, `-${dmg}`, '#ff6b8a');
                world.removeChild(a.c);
                arrows.splice(ai, 1);
                hit = true;

                if (m.hp <= 0) {
                    burst(world, particles, m.x, m.y, 0xffd700, 14, 4);
                    burst(world, particles, m.x, m.y, 0xff4466, 8, 3);
                    shakeRef.value = Math.max(shakeRef.value, 6);
                    xp.addXP(XP_PER_MOB);
                    killsRef.value++;
                    drops.push(...spawnDrops(world, m.x, m.y, 1));
                    if (hudElements.killsEl) {
                        hudElements.killsEl.textContent = killsRef.value;
                        hudElements.killsEl.classList.add('bump');
                        setTimeout(() => hudElements.killsEl.classList.remove('bump'), 160);
                    }
                    world.removeChild(m.c);
                    mobs.splice(mi, 1);
                }
                break;
            }

            if (hit) continue;

            for (let bi = bosses.length - 1; bi >= 0; bi--) {
                const b = bosses[bi];
                if (b.dead) continue;
                if (Math.hypot(b.x - a.c.x, b.y - a.c.y) >= BOSS_RADIUS) continue;

                const dmg = 18 + Math.floor(Math.random() * 10);
                b.hp -= dmg;
                const biomeCol = BIOME_COLORS[b.type]?.glow ?? 0x00ccff;
                burst(world, particles, b.x, b.y, biomeCol, 10, 3.5);
                showFloat(floats, b.x, b.y - 60, `-${dmg}`, '#ffffff');
                world.removeChild(a.c);
                arrows.splice(ai, 1);
                hit = true;

                if (b.hp <= 0) {
                    b.dead = true;
                    burst(world, particles, b.x, b.y, biomeCol, 50, 6);
                    burst(world, particles, b.x, b.y, 0xffd700, 30, 5);
                    shakeRef.value = 18;
                    drops.push(...spawnDrops(world, b.x, b.y, 10));
                    xp.addXP(XP_PER_BOSS);
                    killsRef.value += 5;
                    if (hudElements.killsEl) hudElements.killsEl.textContent = killsRef.value;
                    world.removeChild(b.c);
                    showFloat(floats, b.x, b.y - 90, 'BOSS DEFEATED!', '#ffd700');
                    bossActiveRef.value = null;
                    hideBossPanel(hudElements);
                }
                break;
            }        }
    }

    // ─────────────────────────────
    // Enemy projectiles
    // ─────────────────────────────
    function updateEnemyProjs(px, py, pBody) {
        for (let ei = enemyProjs.length - 1; ei >= 0; ei--) {
            const ep = enemyProjs[ei];
            ep.c.x += ep.vx;
            ep.c.y += ep.vy;
            ep.life--;

            if (ep.life <= 0 || !roomManager.isInsideRoom(ep.c.x, ep.c.y)) {
                world.removeChild(ep.c);
                enemyProjs.splice(ei, 1);
                continue;
            }

            if (Math.hypot(px - ep.c.x, py - ep.c.y) < 16) {
                playerState.pHP -= ep.dmg;
                shakeRef.value = Math.max(shakeRef.value, ep.dmg * 0.25);
                pBody.tint = 0xff0000;
                setTimeout(() => { pBody.tint = 0xffffff; }, 100);
                burst(world, particles, px, py, ep.type === 'ice' ? 0x00ccff : 0xff6600, 8, 2);
                showFloat(floats, px, py - 30, `-${ep.dmg}`, '#ffaa00');
                world.removeChild(ep.c);
                enemyProjs.splice(ei, 1);
            }
        }
    }

    // ─────────────────────────────
    // Drops
    // ─────────────────────────────
    function updateDrops(px, py) {
        for (let di = drops.length - 1; di >= 0; di--) {
            const d = drops[di];
            d.vx *= 0.91;
            d.vy *= 0.91;
            d.c.x += d.vx;
            d.c.y += d.vy;
            d.bob += 0.08;
            d.c.y += Math.sin(d.bob) * 0.28;
            d.gl.alpha = 0.12 + 0.1 * Math.sin(d.bob * 2);

            const ddx = px - d.c.x;
            const ddy = py - d.c.y;
            const ddist = Math.hypot(ddx, ddy);

            if (ddist < 120) {
                d.c.x += ddx * 0.07;
                d.c.y += ddy * 0.07;
            }

            if (ddist < 22) {
                if (d.type === 'hp') {
                    playerState.pHP = Math.min(playerState.pMaxHP, playerState.pHP + 20);
                    burst(world, particles, d.c.x, d.c.y, HEART_COLOR, 6, 2);
                    showFloat(floats, d.c.x, d.c.y, '+20 HP', '#ff2255');
                } else if (d.type === 'gold') {
                    playerState.gold = (playerState.gold ?? 0) + 1;
                    showFloat(floats, d.c.x, d.c.y, '+1', '#ffd700');
                }
                world.removeChild(d.c);
                drops.splice(di, 1);
            }
        }
    }

    return { tryShoot, updateArrows, updateEnemyProjs, updateDrops };
}