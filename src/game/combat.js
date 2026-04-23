import {createArrow, createEnemyProj} from './projectile.js';
import {spawnDrops} from './drops.js';
import {burst} from './particles.js';
import {showFloat} from './floatText.js';
import {hideBossPanel} from './hud.js';
import {BOSS_RADIUS, HEART_COLOR, BIOME_COLORS} from './constants.js';
import {audioManager} from "./audio.js";
import {useGameStore} from "../stores/gameStore.js";
import { Graphics } from 'pixi.js';

/**
 * @param {object} ctx - shared references passed in once at setup
 */
export function createCombatSystem(ctx) {
    const {
        world, entities, particles, floats,
        shakeRef, hudElements,
        killsRef, bossActiveRef, xp, roomManager
    } = ctx;

    const {mobs, bosses, arrows, enemyProjs, drops} = entities;

    // ─────────────────────────────
    // Helper: Find nearest mob NOT already hit
    // ─────────────────────────────
    function findNearestUnhitMob(fromX, fromY, hitMobsSet, maxRange = 350) {
        let nearest = null;
        let nearestDist = maxRange;

        for (const mob of mobs) {
            // CRITICAL: Skip if already hit in this chain
            if (hitMobsSet.has(mob)) continue;

            const dx = mob.x - fromX;
            const dy = mob.y - fromY;
            const dist = Math.hypot(dx, dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = mob;
            }
        }

        return nearest;
    }

    // ─────────────────────────────
    // Helper: Create chain effect
    // ─────────────────────────────
    function createChainEffect(fromX, fromY, toX, toY) {
        const line = new Graphics();
        line.moveTo(0, 0);
        line.lineTo(toX - fromX, toY - fromY);
        line.stroke({ color: "white", width: 3, alpha: 0.8 });
        line.position.set(fromX, fromY);
        world.addChild(line);

        // Fade and remove
        let alpha = 1;
        const interval = setInterval(() => {
            alpha -= 0.1;
            line.alpha = alpha;
            if (alpha <= 0) {
                clearInterval(interval);
                world.removeChild(line);
            }
        }, 50);
    }

    // ─────────────────────────────
    // Shooting with chain stats
    // ─────────────────────────────
    function tryShoot(px, py, tx, ty) {
        const stats = useGameStore.getState().player.stats;

        for (let i = 0; i < stats.projectiles; i++) {
            const spread = (i - (stats.projectiles - 1) / 2) * 0.12;

            // Add chain properties from player stats
            const chainData = {
                chainRemaining: stats.chainEnabled ? stats.chainCount : 0,
                chainHitMobs: new Set(),  // This Set tracks ALL mobs hit in this chain
                damage: stats.damage,
                chainRange: stats.chainRange,
                chainDamageMultiplier: stats.chainDamage
            };

            arrows.push(createArrow(world, px, py, tx, ty, spread, chainData));
        }
    }

    // ─────────────────────────────
    // Arrows with chain logic
    // ─────────────────────────────
    function updateArrows(px, py) {
        const stats = useGameStore.getState().player.stats;
        const store = useGameStore.getState();

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
            for (let mi = mobs.length - 1; mi >= 0; mi--) {
                const m = mobs[mi];
                if (Math.hypot(m.x - a.c.x, m.y - a.c.y) >= 16) continue;

                if (a.chainHitMobs && a.chainHitMobs.has(m)) {
                    continue;
                }

                // Calculate base damage
                let baseDmg = a.damage > 0 ? a.damage : (stats.damage + Math.floor(Math.random() * 6));

                // Apply crit if this is not a chain arrow (or allow chain arrows to also crit)
                let finalDamage = baseDmg;
                let isCrit = false;

                if (!a.isChainArrow) {
                    const critResult = store.calculateCritDamage(baseDmg);
                    finalDamage = critResult.damage;
                    isCrit = critResult.isCrit;
                } else {
                    // Chain arrows use chain damage multiplier
                    finalDamage = Math.floor(baseDmg * (a.chainDamageMultiplier || stats.chainDamage));
                }

                m.hp -= finalDamage;

                // Visual effects based on crit
                const hitColor = isCrit ? 0xffaa00 : 0xff4466;
                const particleCount = isCrit ? 12 : 7;
                burst(world, particles, m.x, m.y, hitColor, particleCount);

                // Show damage text with crit indicator
                const damageText = isCrit ? `-${finalDamage} CRIT!` : `-${finalDamage}`;
                const textColor = isCrit ? '#ffaa00' : '#fff';
                showFloat(floats, m.x, m.y - 20, damageText, textColor);

                // Play sound (maybe different for crits)
                audioManager.playSFX('/sounds/hit-splat.ogg', 0.3);
                if (isCrit) {
                    audioManager.playSFX('/sounds/crit.ogg', 0.4); // Optional crit sound
                }

                if (a.chainHitMobs) {
                    a.chainHitMobs.add(m);
                }

                // Chain logic
                if (a.chainRemaining > 0 && stats.chainEnabled) {
                    const nextMob = findNearestUnhitMob(
                        m.x, m.y,
                        a.chainHitMobs,
                        a.chainRange || stats.chainRange
                    );

                    if (nextMob) {
                        createChainEffect(m.x, m.y, nextMob.x, nextMob.y);

                        if (audioManager.playChainSound) {
                            audioManager.playChainSound(0.25);
                        } else {
                            audioManager.playSFX('/sounds/chain.ogg', 0.25);
                        }

                        const chainData = {
                            chainRemaining: a.chainRemaining - 1,
                            chainHitMobs: a.chainHitMobs,
                            damage: finalDamage,
                            chainRange: a.chainRange || stats.chainRange,
                            chainDamageMultiplier: stats.chainDamage,
                            isChainArrow: true
                        };

                        const chainArrow = createArrow(
                            world,
                            m.x, m.y,
                            nextMob.x, nextMob.y,
                            0,
                            chainData
                        );

                        arrows.push(chainArrow);
                    }
                }

                world.removeChild(a.c);
                arrows.splice(ai, 1);
                hit = true;

                if (m.hp <= 0) {
                    burst(world, particles, m.x, m.y, 0xffd700, 14, 4);
                    burst(world, particles, m.x, m.y, 0xff4466, 8, 3);
                    shakeRef.value = Math.max(shakeRef.value, 6);

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

            // vs bosses (with crit support)
            for (let bi = bosses.length - 1; bi >= 0; bi--) {
                const b = bosses[bi];
                if (b.dead) continue;
                if (Math.hypot(b.x - a.c.x, b.y - a.c.y) >= BOSS_RADIUS) continue;

                let baseDmg = 18 + Math.floor(Math.random() * 10);
                const critResult = store.calculateCritDamage(baseDmg);
                const finalDamage = critResult.damage;
                const isCrit = critResult.isCrit;

                b.hp -= finalDamage;
                const biomeCol = BIOME_COLORS[b.type]?.glow ?? 0x00ccff;
                const hitColor = isCrit ? 0xffaa00 : biomeCol;
                burst(world, particles, b.x, b.y, hitColor, isCrit ? 15 : 10, 3.5);

                const damageText = isCrit ? `-${finalDamage} CRIT!` : `-${finalDamage}`;
                const textColor = isCrit ? '#ffaa00' : '#ffffff';
                showFloat(floats, b.x, b.y - 60, damageText, textColor);

                world.removeChild(a.c);
                arrows.splice(ai, 1);
                hit = true;

                audioManager.playSFX('/sounds/hit-splat.ogg', 0.3);
                if (isCrit) {
                    audioManager.playSFX('/sounds/crit.ogg', 0.4);
                }

                if (b.hp <= 0) {
                    b.dead = true;
                    burst(world, particles, b.x, b.y, biomeCol, 50, 6);
                    burst(world, particles, b.x, b.y, 0xffd700, 30, 5);
                    shakeRef.value = 18;
                    drops.push(...spawnDrops(world, b.x, b.y, 10));
                    killsRef.value += 5;
                    if (hudElements.killsEl) hudElements.killsEl.textContent = killsRef.value;
                    world.removeChild(b.c);
                    showFloat(floats, b.x, b.y - 90, 'BOSS DEFEATED!', '#ffd700');
                    bossActiveRef.value = null;
                    hideBossPanel(hudElements);
                }
                break;
            }
        }
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
                useGameStore.getState().damagePlayer(ep.dmg, 'boss proj attack');
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
                    useGameStore.getState().healPlayer(20);
                    burst(world, particles, d.c.x, d.c.y, HEART_COLOR, 6, 2);
                    showFloat(floats, d.c.x, d.c.y, '+20 HP', '#ff2255');
                } else if (d.type === 'gold') {
                    const store = useGameStore.getState();
                    store.player.gold = (store.player.gold ?? 0) + 1;
                    showFloat(floats, d.c.x, d.c.y, '+1', '#ffd700');
                }
                world.removeChild(d.c);
                drops.splice(di, 1);
            }
        }
    }

    return {tryShoot, updateArrows, updateEnemyProjs, updateDrops};
}