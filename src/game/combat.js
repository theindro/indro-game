import {ARROW_TYPES, createArrow, updateArrowParticleAnimation} from './projectile.js';
import {burst, emitEmber, emitSmoke} from './particles.js';
import {showFloat} from './floatText.js';
import {BOSS_RADIUS, HEART_COLOR, BIOME_COLORS} from './constants.js';
import {audioManager} from "./utils/audioManager.js";
import {useGameStore} from "../stores/gameStore.js";
import {Container, Graphics} from 'pixi.js';
import {DropManager} from './utils/dropManager.js';
import {useFrostArrow} from "./abilities/FrostArrow.js";
import {AbilityManager} from "./abilities/AbilityManager.js";
import {useArrowBarrage} from "./abilities/ArrowBarrage.js";
import {useRapidFire} from "./abilities/RapidFire.js";

/**
 * @param {object} ctx - shared references passed in once at setup
 */
export function createCombatSystem(ctx) {
    const {
        world, entities, particles, floats,
        shakeRef, bossActiveRef, openWorld
    } = ctx;

    const {mobs, bosses, arrows, enemyProjs, drops} = entities;

    // In createCombatSystem function, add:
    const dropManager = new DropManager(world, openWorld.entityLayer );

    // Create ability manager instance
    const abilityManager = new AbilityManager(ctx);

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
        line.stroke({color: "white", width: 3, alpha: 0.8});
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

            if (a.life <= 0 || !openWorld.isInsideWorld(a.c.x, a.c.y)) {
                world.removeChild(a.c);
                arrows.splice(ai, 1);
                continue;
            }

            updateArrowParticleAnimation(a, 1);

            let hit = false;

            // === NEW: Check collision with props ===
            if (ctx.colliders && ctx.colliders.length) {
                for (const collider of ctx.colliders) {
                    // Check if collider has collision enabled
                    if (!collider.collision) continue;

                    // Handle rectangle colliders (from your resolveVsColliders function)
                    const halfW = collider.width * 0.5;
                    const halfH = collider.height * 0.5;
                    const left = collider.x - halfW;
                    const right = collider.x + halfW;
                    const top = collider.y - halfH;
                    const bottom = collider.y + halfH;

                    const arrowRadius = 4;

                    // Check if arrow point is inside rectangle (expanded by radius)
                    const closestX = Math.max(left, Math.min(a.c.x, right));
                    const closestY = Math.max(top, Math.min(a.c.y, bottom));
                    const dx = a.c.x - closestX;
                    const dy = a.c.y - closestY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < arrowRadius * arrowRadius) {
                        // Arrow hit collider
                        burst(world, particles, a.c.x, a.c.y, 0xaaaaaa, 5, 2);
                        world.removeChild(a.c);
                        arrows.splice(ai, 1);
                        hit = true;
                        break;
                    }
                }
                if (hit) continue;
            }

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

                    useGameStore.getState().addKills(1);

                    // Spawn drops using drop manager
                    const isElite = m.type === 'elite';
                    const newDrops = dropManager.spawnDrops(world, m.x, m.y, isElite ? 'elite' : 'default', false);
                    drops.push(...newDrops);

                    openWorld.entityLayer.removeChild(m.c);
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

                    // Spawn boss drops
                    const bossDrops = dropManager.spawnDrops(world, b.x, b.y, 'default', true);

                    drops.push(...bossDrops);

                    world.removeChild(b.c);

                    showFloat(floats, b.x, b.y - 90, 'BOSS DEFEATED!', '#ffd700');

                    bossActiveRef.value = null;
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

            // Check life and world bounds
            if (ep.life <= 0 || !openWorld.isInsideWorld(ep.c.x, ep.c.y)) {
                // Remove from its parent (entityLayer)
                if (ep.c.parent) {
                    ep.c.parent.removeChild(ep.c);
                }
                ep.c.destroy();
                enemyProjs.splice(ei, 1);
                continue;
            }

            // === NEW: Check collision with props ===
            let hitProp = false;
            if (ctx.colliders && ctx.colliders.length) {
                for (const collider of ctx.colliders) {
                    // Check if collider is a prop (has radius)
                    if (collider.type === 'prop' || collider.r) {
                        const dist = Math.hypot(ep.c.x - collider.x, ep.c.y - collider.y);
                        const projRadius = 6; // Enemy projectile hit radius

                        if (dist < (collider.r || 10) + projRadius) {
                            // Projectile hit a prop - create impact effect and remove projectile
                            burst(world, particles, ep.c.x, ep.c.y, 0xff6666, 6, 2);
                            // Remove from its parent
                            if (ep.c.parent) {
                                ep.c.parent.removeChild(ep.c);
                            }
                            enemyProjs.splice(ei, 1);
                            hitProp = true;
                            break;
                        }
                    }
                }
            }
            if (hitProp) continue;

            // Check collision with player
            if (Math.hypot(px - ep.c.x, py - ep.c.y) < 16) {
                useGameStore.getState().damagePlayer(ep.dmg, 'enemy projectile');
                // Remove from its parent
                if (ep.c.parent) {
                    ep.c.parent.removeChild(ep.c);
                }
                enemyProjs.splice(ei, 1);
            }
        }
    }

    // ─────────────────────────────
    // Drops
    // ─────────────────────────────
// Update updateDrops function to handle item drops
    function updateDrops(px, py) {
        for (let di = drops.length - 1; di >= 0; di--) {
            const d = drops[di];
            d.update(); // Call the update function for animation

            const ddx = px - d.container.x;
            const ddy = py - d.container.y;
            const ddist = Math.hypot(ddx, ddy);

            // Magnetic effect
            if (ddist < 120) {
                d.container.x += ddx * 0.07;
                d.container.y += ddy * 0.07;
            }

            // Pickup
            if (ddist < 22) {
                if (d.type === 'hp') {
                    useGameStore.getState().healPlayer(d.amount || 20);
                    burst(world, particles, d.container.x, d.container.y, 0xff2255, 6, 2);
                    showFloat(floats, d.container.x, d.container.y, `+${d.amount || 20} HP`, '#ff2255');
                }
                else if (d.type === 'gold') {
                    useGameStore.getState().addGold(d.amount || 1);
                    showFloat(floats, d.container.x, d.container.y, `+${d.amount || 1}`, '#ffd700');
                }
                else if (d.type === 'item' && d.item) {
                    // Add item to inventory
                    const added = useGameStore.getState().addItem(d.item, 1);

                    if (added) {
                        const rarityColor = d.item.rarity?.color || '#ffaa44';
                        showFloat(floats, d.container.x, d.container.y, d.item.name, rarityColor);
                        // burst(world, particles, d.container.x, d.container.y, 0xffaa44, 8, 2);
                        // audioManager.playSFX('/sounds/pickup.ogg', 0.3);
                    }
                }

                d.destroy();
                drops.splice(di, 1);
            }
        }
    }


    // Update freeze timers
    function updateFreezeTimers() {
        abilityManager.updateFreezeTimers();
    }


    // Wrapper functions that pass ctx to abilities
    function useArrowBarrageWrapper(px, py, targetX, targetY) {
        const abilityCtx = { ...ctx, arrows, abilityManager };
        return useArrowBarrage(abilityCtx, px, py, targetX, targetY);
    }

    function useRapidFireWrapper(px, py, targetX, targetY) {
        const abilityCtx = { ...ctx, arrows, abilityManager };
        return useRapidFire(abilityCtx, px, py, targetX, targetY);
    }

    function useFrostArrowWrapper(px, py, targetX, targetY) {
        const abilityCtx = { ...ctx, arrows, mobs, bosses, abilityManager };
        return useFrostArrow(abilityCtx, px, py, targetX, targetY);
    }

    return {
        tryShoot,
        updateArrows,
        updateEnemyProjs,
        updateDrops,
        updateFreezeTimers,
        useArrowBarrage: useArrowBarrageWrapper,
        useRapidFire: useRapidFireWrapper,
        useFrostArrow: useFrostArrowWrapper
    };
}

