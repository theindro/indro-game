// controllers/subsystems/createArrowSystem.js
import { Graphics } from "pixi.js";
import { useGameStore } from "../../../stores/gameStore.js";
import { createArrow, updateArrowParticleAnimation } from "../createProjectileController.js";
import { burst } from "../../utils/particles.js";
import { showFloat } from "../../utils/floatText.js";
import { audioManager } from "../../utils/audioManager.js";
import { BIOME_COLORS, BOSS_RADIUS } from "../../constants.js";
import {applyStatusEffect, createBurnEffect, createFreezeEffect} from "../../statusEffects.js";

export function createArrowSystem(ctx) {
    // Destructure all needed dependencies
    const {
        world,
        entities,
        particles,
        floats,
        shakeRef,
        openWorld,
        colliders,
        spawnDrops  // Callback function to spawn drops
    } = ctx;

    const { mobs, bosses, arrows, drops } = entities;
    const entityLayer = openWorld.entityLayer;

    function findNearestUnhitMob(fromX, fromY, hitMobsSet, maxRange = 350) {
        let nearest = null;
        let nearestDist = maxRange;

        for (const mob of mobs) {
            if (hitMobsSet.has(mob)) continue;
            if (mob.hp <= 0) continue;

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

    function createChainEffect(fromX, fromY, toX, toY) {
        const line = new Graphics();
        line.moveTo(0, 0);
        line.lineTo(toX - fromX, toY - fromY);
        line.stroke({ color: "white", width: 3, alpha: 0.8 });
        line.position.set(fromX, fromY);
        entityLayer.addChild(line);

        let alpha = 1;
        const interval = setInterval(() => {
            alpha -= 0.1;
            line.alpha = alpha;
            if (alpha <= 0) {
                clearInterval(interval);
                entityLayer.removeChild(line);
            }
        }, 50);
    }

    function checkCollisionWithProps(arrowX, arrowY, colliders) {
        if (!colliders || !colliders.length) return false;

        const arrowRadius = 4;

        for (const collider of colliders) {
            if (!collider.collision) continue;

            const halfW = collider.width * 0.5;
            const halfH = collider.height * 0.5;
            const left = collider.x - halfW;
            const right = collider.x + halfW;
            const top = collider.y - halfH;
            const bottom = collider.y + halfH;

            const closestX = Math.max(left, Math.min(arrowX, right));
            const closestY = Math.max(top, Math.min(arrowY, bottom));
            const dx = arrowX - closestX;
            const dy = arrowY - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < arrowRadius * arrowRadius) {
                return true;
            }
        }
        return false;
    }

    function handleMobDeath(mob, index, x, y, isElite) {
        // Visual effects
        burst(entityLayer, particles, x, y, 0xffd700, 14, 4);
        burst(entityLayer, particles, x, y, 0xff4466, 8, 3);
        shakeRef.value = Math.max(shakeRef.value, 6);

        // Update stats
        useGameStore.getState().addKills(1);

        // Spawn drops using the callback
        if (spawnDrops) {
            const mobType = isElite ? 'elite' : mob.biome || 'default';
            const newDrops = spawnDrops(x, y, mobType, false);
            if (newDrops && drops) {
                drops.push(...newDrops);
            }
        }

        // Remove from world
        if (mob.c && mob.c.parent) {
            mob.c.parent.removeChild(mob.c);
        }
        mobs.splice(index, 1);
    }

    function handleBossDeath(boss, x, y) {
        const biomeCol = BIOME_COLORS[boss.type]?.glow ?? 0x00ccff;

        burst(entityLayer, particles, x, y, biomeCol, 50, 6);
        burst(entityLayer, particles, x, y, 0xffd700, 30, 5);
        shakeRef.value = 18;

        // Spawn boss drops
        if (spawnDrops) {
            const bossDrops = spawnDrops(x, y, boss.type, true);
            if (bossDrops && drops) {
                drops.push(...bossDrops);
            }
        }

        // Remove from world
        if (boss.c && boss.c.parent) {
            boss.c.parent.removeChild(boss.c);
        }

        showFloat(floats, x, y - 90, 'BOSS DEFEATED!', '#ffd700');

        // Mark as dead (caller will handle removing from array)
        boss.dead = true;
    }

    function updateArrows(px, py) {
        const stats = useGameStore.getState().player.stats;
        const store = useGameStore.getState();

        for (let ai = arrows.length - 1; ai >= 0; ai--) {
            const a = arrows[ai];
            a.c.x += a.vx;
            a.c.y += a.vy;
            a.life--;

            // Check life and world bounds
            if (a.life <= 0 || !openWorld.isInsideWorld(a.c.x, a.c.y)) {
                if (a.c.parent) entityLayer.removeChild(a.c);
                arrows.splice(ai, 1);
                continue;
            }

            updateArrowParticleAnimation(a, 1);

            let hit = false;

            // Check collision with props
            if (checkCollisionWithProps(a.c.x, a.c.y, colliders)) {
                burst(world, particles, a.c.x, a.c.y, 0xaaaaaa, 5, 2);
                if (a.c.parent) entityLayer.removeChild(a.c);
                arrows.splice(ai, 1);
                continue;
            }

            // vs mobs
            for (let mi = 0; mi < mobs.length; mi++) {
                const m = mobs[mi];
                if (Math.hypot(m.x - a.c.x, m.y - a.c.y) >= 16) continue;
                if (a.chainHitMobs && a.chainHitMobs.has(m)) continue;

                // Calculate damage
                let baseDmg = a.damage > 0 ? a.damage : (stats.damage + Math.floor(Math.random() * 6));
                let finalDamage = baseDmg;
                let isCrit = false;

                if (!a.isChainArrow) {
                    const critResult = store.calculateCritDamage(baseDmg);
                    finalDamage = critResult.damage;
                    isCrit = critResult.isCrit;
                } else {
                    finalDamage = Math.floor(baseDmg * (a.chainDamageMultiplier || stats.chainDamage));
                }

                m.hp -= finalDamage;

                // Visual effects
                const hitColor = isCrit ? 0xffaa00 : 0xff4466;
                const particleCount = isCrit ? 12 : 7;
                burst(entityLayer, particles, m.x, m.y, hitColor, particleCount);
                showFloat(floats, m.x, m.y - 20, isCrit ? `-${finalDamage} CRIT!` : `-${finalDamage}`, isCrit ? '#ffaa00' : '#fff');

                if (a.elementalEffect === 'fire') {
                    applyStatusEffect(m, createBurnEffect(5000, 5));
                }

                // Sound effects
                audioManager.playSFX('/sounds/hit-splat.ogg', 0.3);
                if (isCrit) audioManager.playSFX('/sounds/crit.ogg', 0.4);

                if (a.chainHitMobs) a.chainHitMobs.add(m);

                // Chain logic
                if (a.chainRemaining > 0 && stats.chainEnabled) {
                    const nextMob = findNearestUnhitMob(
                        m.x, m.y,
                        a.chainHitMobs,
                        a.chainRange || stats.chainRange
                    );

                    if (nextMob) {
                        createChainEffect(m.x, m.y, nextMob.x, nextMob.y);
                        audioManager.playSFX('/sounds/chain.ogg', 0.25);

                        const chainData = {
                            chainRemaining: a.chainRemaining - 1,
                            chainHitMobs: a.chainHitMobs,
                            damage: finalDamage,
                            chainRange: a.chainRange || stats.chainRange,
                            chainDamageMultiplier: stats.chainDamage,
                            isChainArrow: true
                        };

                        const chainArrow = createArrow(
                            entityLayer,
                            m.x, m.y,
                            nextMob.x, nextMob.y,
                            0,
                            chainData
                        );
                        arrows.push(chainArrow);
                    }
                }

                // Cleanup current arrow
                if (a.c.parent) entityLayer.removeChild(a.c);
                arrows.splice(ai, 1);
                hit = true;

                // Handle mob death
                if (m.hp <= 0) {
                    const isElite = m.type === 'elite';
                    handleMobDeath(m, mi, m.x, m.y, isElite);
                }
                break;
            }

            if (hit) continue;

            // vs bosses
            for (let bi = 0; bi < bosses.length; bi++) {
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
                burst(entityLayer, particles, b.x, b.y, hitColor, isCrit ? 15 : 10, 3.5);
                showFloat(floats, b.x, b.y - 60, isCrit ? `-${finalDamage} CRIT!` : `-${finalDamage}`, isCrit ? '#ffaa00' : '#ffffff');

                if (a.c.parent) entityLayer.removeChild(a.c);
                arrows.splice(ai, 1);
                hit = true;

                audioManager.playSFX('/sounds/hit-splat.ogg', 0.3);
                if (isCrit) audioManager.playSFX('/sounds/crit.ogg', 0.4);

                if (b.hp <= 0) {
                    handleBossDeath(b, b.x, b.y);
                    bosses.splice(bi, 1);
                }
                break;
            }
        }
    }

    return { updateArrows };
}