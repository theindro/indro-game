// controllers/subsystems/createArrowSystem.js
import {Graphics} from "pixi.js";
import {useGameStore} from "../../../stores/gameStore.js";
import {createArrow, updateArrowParticleAnimation, ARROW_TYPES} from "../createProjectileController.js";
import {audioManager} from "../../utils/audioManager.js";
import {BIOME_COLORS, BOSS_RADIUS, ARROW_CONFIG, DEFAULT_ATTACK_RANGE} from "../../constants.js";
import {
    applyStatusEffect,
    createBurnEffect,
    createFreezeEffect,
    createPoisonEffect, STATUS_COLORS_RGBA,
} from "../../statusEffects.js";
import {VFX} from "../../GlobalEffects.js";

// Constants
const COLLISION_RADIUS = 16;
const ARROW_RADIUS = 4;
const CHAIN_FADE_DURATION = 50;
const CHAIN_ALPHA_STEP = 0.1;

export function createArrowSystem(ctx) {
    const {
        entities,
        openWorld,
        colliders,
        spawnDrops
    } = ctx;

    const { arrows, drops } = entities;
    const entityLayer = openWorld.entityLayer;

    /**
     * Finds the nearest unhit mob within range
     */
    function findNearestUnhitMob(fromX, fromY, hitMobsSet, maxRange = ARROW_CONFIG.DEFAULT_CHAIN_RANGE) {
        let nearest = null;
        let nearestDistSq = maxRange * maxRange;

        for (const mob of entities.mobs) {
            if (hitMobsSet.has(mob) || mob.hp <= 0) continue;

            const dx = mob.x - fromX;
            const dy = mob.y - fromY;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = mob;
            }
        }

        return nearest;
    }

    /**
     * Creates a visual chain effect between two points
     */
    function createChainEffect(fromX, fromY, toX, toY) {
        const line = new Graphics();
        const dx = toX - fromX;
        const dy = toY - fromY;

        line.moveTo(0, 0);
        line.lineTo(dx, dy);
        line.stroke({color: "white", width: 3, alpha: 0.8});
        line.position.set(fromX, fromY);
        entityLayer.addChild(line);

        let alpha = 1;
        const interval = setInterval(() => {
            alpha -= CHAIN_ALPHA_STEP;
            line.alpha = alpha;

            if (alpha <= 0) {
                clearInterval(interval);
                entityLayer.removeChild(line);
                line.destroy();
            }
        }, CHAIN_FADE_DURATION);
    }

    /**
     * Checks collision between arrow and world colliders
     */
    function checkCollisionWithProps(arrowX, arrowY) {
        if (!colliders?.length) return false;

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

            if (dx * dx + dy * dy < ARROW_RADIUS * ARROW_RADIUS) {
                return true;
            }
        }
        return false;
    }

    /**
     * Handles mob death: effects, stats, drops, cleanup
     */
    function handleMobDeath(mob, index, x, y) {
        const isElite = mob.type === 'elite';
        const dropColor = isElite ? 0xffaa44 : 0xffd700;

        // 🔥 CALL DESTROY ON ARCHETYPE HERE 🔥
        if (mob.controller && mob.controller.archetype && mob.controller.archetype.destroy) {
            console.log('Calling destroy on archetype:', mob.archetype);
            mob.controller.archetype.destroy();
        }

        // Visual effects
        //VFX.burst(x, y, dropColor, 14, 4);
        //VFX.burst(x, y, 0xff4466, 8, 3);
        //VFX.shake(6)

        const minMobSize = 12;
        const maxMobSize = 40;

        const minScale = 0.2;
        const maxScale = 0.5;

        const scale =
            minScale +
            ((mob.size - minMobSize) / (maxMobSize - minMobSize)) *
            (maxScale - minScale);

        VFX.explosion(x, y, '', scale,  mob.size);

        // Update stats
        useGameStore.getState().addKills(1);

        VFX.addFloat(
            `+${mob.exp} XP`,
            mob.x,
            mob.y - 30,
            'orange'
        );

        useGameStore.getState().addXP(mob.exp);

        // Spawn drops
        if (spawnDrops) {
            const mobType = isElite ? 'elite' : (mob.biome || 'default');
            const newDrops = spawnDrops(x, y, mobType, false);
            if (newDrops?.length) {
                drops.push(...newDrops);
            }
        }

        // Cleanup
        if (mob.c?.parent) {
            mob.c.parent.removeChild(mob.c);
            mob.c.destroy();
        }
        entities.mobs.splice(index, 1);
    }

    /**
     * Handles boss death: effects, drops, cleanup
     */
    function handleBossDeath(boss, x, y) {
        const biomeCol = BIOME_COLORS[boss.type]?.glow ?? 0x00ccff;

        if (typeof boss.onDefeat === 'function') {
            try {
                boss.onDefeat(boss);
            } catch (err) {
                console.warn('[boss] onDefeat failed:', err);
            }
        }

        if (boss.destroy) {
            boss.destroy();
        }

        //VFX.burst(x, y, biomeCol, 50, 6);
        //VFX.burst(x, y, 0xffd700, 30, 5);
        VFX.shake(18);

        // Spawn boss drops
        if (spawnDrops) {
            const bossDrops = spawnDrops(x, y, boss.type, true);
            if (bossDrops?.length) {
                drops.push(...bossDrops);
            }
        }

        // Cleanup
        if (boss.c?.parent) {
            boss.c.parent.removeChild(boss.c);
            boss.c.destroy();
        }

        VFX.addFloat('BOSS DEFEATED!', x, y - 90, '#ffd700');
        boss.dead = true;
    }

    /**
     * Calculates arrow damage with crit support
     */
    function calculateArrowDamage(arrow, stats, store) {
        let baseDamage = arrow.damage > 0 ? arrow.damage : (stats.damage + Math.floor(Math.random() * 6));

        if (arrow.isChainArrow) {
            return {
                damage: Math.floor(baseDamage * (arrow.chainDamageMultiplier || stats.chainDamage)),
                isCrit: false
            };
        }

        return store.calculateCritDamage(baseDamage);
    }

    /**
     * Spawns chain arrow if conditions are met
     */
    function trySpawnChainArrow(currentMob, arrow, finalDamage, stats) {
        if (!stats.chainEnabled || arrow.chainRemaining <= 0) return false;

        const nextMob = findNearestUnhitMob(
            currentMob.x, currentMob.y,
            arrow.chainHitMobs,
            arrow.chainRange || stats.chainRange
        );

        if (!nextMob) return false;

        createChainEffect(currentMob.x, currentMob.y, nextMob.x, nextMob.y);

        const chainArrow = createArrow(
            entityLayer,
            currentMob.x, currentMob.y,
            nextMob.x, nextMob.y,
            0,
            {
                chainRemaining: arrow.chainRemaining - 1,
                chainHitMobs: arrow.chainHitMobs,
                damage: finalDamage,
                chainRange: arrow.chainRange || stats.chainRange,
                chainDamageMultiplier: stats.chainDamage,
                isChainArrow: true
            },
            arrow.arrowType ?? ARROW_TYPES.NORMAL,
            {
                maxRange: stats.attackRange ?? DEFAULT_ATTACK_RANGE,
                speedScale: stats.projectileSpeed ?? 1,
            }
        );

        arrows.push(chainArrow);
        return true;
    }

    /**
     * Applies hit effects to a target
     */
    function applyHitEffects(x, y, damage, isCrit, isBoss = false, elementalType = 'normal') {
        const particleCount = isCrit ? (isBoss ? 15 : 12) : (isBoss ? 10 : 7);
        const textColor = '#fff';
        const burstColor = 'black';
        const damageText = isCrit ? `${parseInt(damage)} CRIT!` : `${parseInt(damage)}`;


        VFX.burst(x, y, burstColor);

        VFX.addFloat(damageText, x, y, textColor);

        audioManager.playSFX('/sounds/hit-splat.ogg', 0.3);
    }

    /**
     * Updates and processes all active arrows
     */
    function updateArrows(px, py, dt = 1 / 60) {
        const stats = useGameStore.getState().player.stats;
        const store = useGameStore.getState();
        const frameScale = dt * 60;

        for (let ai = arrows.length - 1; ai >= 0; ai--) {
            const arrow = arrows[ai];

            arrow.c.x += arrow.vx * frameScale;
            arrow.c.y += arrow.vy * frameScale;

            arrow.c.zIndex = arrow.c.y;

            const maxR = arrow.maxRange ?? DEFAULT_ATTACK_RANGE;
            const sdx = arrow.c.x - arrow.spawnX;
            const sdy = arrow.c.y - arrow.spawnY;
            if (sdx * sdx + sdy * sdy >= maxR * maxR) {
                if (arrow.vfxGlow) {
                    VFX.removeAttached(arrow.vfxGlow);
                    arrow.vfxGlow = null;
                }
                if (arrow.c.parent) {
                    arrow.c.parent.removeChild(arrow.c);
                    arrow.c.destroy();
                }
                arrows.splice(ai, 1);
                continue;
            }

            arrow.life -= frameScale;

            if (arrow.life <= 0 || !openWorld.isInsideWorld(arrow.c.x, arrow.c.y)) {
                if (arrow.vfxGlow) {
                    VFX.removeAttached(arrow.vfxGlow);
                    arrow.vfxGlow = null;
                }
                if (arrow.c.parent) {
                    arrow.c.parent.removeChild(arrow.c);
                    arrow.c.destroy();
                }
                arrows.splice(ai, 1);
                continue;
            }

            updateArrowParticleAnimation(arrow, dt);

            // Check collision with props
            if (checkCollisionWithProps(arrow.c.x, arrow.c.y)) {
                VFX.burst(arrow.c.x, arrow.c.y, 'white');
                if (arrow.vfxGlow) {
                    VFX.removeAttached(arrow.vfxGlow);
                    arrow.vfxGlow = null;
                }
                if (arrow.c.parent) {
                    arrow.c.parent.removeChild(arrow.c);
                    arrow.c.destroy();
                }
                arrows.splice(ai, 1);
                continue;
            }

            let hit = false;

            // Check collision with mobs
            for (let mi = 0; mi < entities.mobs.length; mi++) {
                const mob = entities.mobs[mi];
                if (!mob.c || mob.hp <= 0) continue; // ← ADD THIS guard

                const mobRadius = (mob.size ?? COLLISION_RADIUS);

                if (Math.hypot(mob.x - arrow.c.x, mob.y - arrow.c.y) >= mobRadius) continue;

                if (arrow.chainHitMobs?.has(mob)) continue;

                // Calculate damage
                const {damage: finalDamage, isCrit} = calculateArrowDamage(arrow, stats, store);
                mob.hp -= finalDamage;

                // Apply hit effects
                applyHitEffects(mob.x, mob.y, finalDamage, isCrit, false, arrow.elementalEffect);

                // Apply elemental effects
                if (arrow.elementalEffect === 'burn') {
                    applyStatusEffect(mob, createBurnEffect(2, 4));
                }

                // Apply elemental effects
                if (arrow.elementalEffect === 'poison') {
                    applyStatusEffect(mob, createPoisonEffect(4, 2));
                }

                // Apply elemental effects
                if (arrow.elementalEffect === 'ice') {
                    applyStatusEffect(mob, createFreezeEffect(2, 5));
                }


                // Track hit mobs for chain
                if (arrow.chainHitMobs) arrow.chainHitMobs.add(mob);

                // Handle chain reaction
                if (arrow.chainRemaining > 0 && stats.chainEnabled) {
                    trySpawnChainArrow(mob, arrow, finalDamage, stats);
                }

                if (arrow.vfxGlow) {
                    VFX.removeAttached(arrow.vfxGlow);
                    arrow.vfxGlow = null;
                }
                if (arrow.c.parent) {
                    arrow.c.parent.removeChild(arrow.c);
                    arrow.c.destroy();
                }
                arrows.splice(ai, 1);
                hit = true;

                // Handle mob death
                if (mob.hp <= 0) {
                    handleMobDeath(mob, mi, mob.x, mob.y);
                    mi--; // Adjust index after deletion
                }
                break;
            }

            if (hit) continue;

            // Check collision with bosses
            for (let bi = 0; bi < entities.bosses.length; bi++) {
                const boss = entities.bosses[bi];
                if (boss.dead) continue;
                if (Math.hypot(boss.x - arrow.c.x, boss.y - arrow.c.y) >= BOSS_RADIUS) continue;

                // Calculate boss damage
                let baseDamage = ARROW_CONFIG.BOSS_BASE_DAMAGE + Math.floor(Math.random() * 10);
                const {damage: finalDamage, isCrit} = store.calculateCritDamage(baseDamage);
                boss.hp -= finalDamage;

                // Apply hit effects
                applyHitEffects(boss.x, boss.y, finalDamage, isCrit, true, arrow.elementalEffect);

                if (arrow.vfxGlow) {
                    VFX.removeAttached(arrow.vfxGlow);
                    arrow.vfxGlow = null;
                }
                if (arrow.c.parent) {
                    arrow.c.parent.removeChild(arrow.c);
                    arrow.c.destroy();
                }

                arrows.splice(ai, 1);

                hit = true;

                // Handle boss death
                if (boss.hp <= 0) {
                    handleBossDeath(boss, boss.x, boss.y);
                    entities.bosses.splice(bi, 1);
                    bi--; // Adjust index after deletion
                }

                break;
            }
        }
    }

    return {updateArrows};
}