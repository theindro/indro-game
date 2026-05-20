import {frameScale, GS, MOB_RADIUS, MOB_SIM_RADIUS} from "../constants.js";
import { applyMobDifficulty, getMobExpReward } from '../difficultyScaling.js';
import { getWorldContentScales } from '../world/worldProgression.js';
import { attachMonsterLevelUi, drawMonsterHpWithLevel } from '../ui/monsterLevelUi.js';
import {useGameStore} from "../../stores/gameStore.js";
import {createMobEntity} from "../entities/createMobEntity.js";
import {resolveVsColliders} from "../world/collision.js";
import {
    ARCHETYPES,
    archetypeMap,
    ARCHETYPE_STATS,
    applyArchetypeVisuals,
    pickSpawnArchetype,
} from './mobArchetypes/index.js';
import {updateStatusEffects} from "../statusEffects.js";
import {VFX} from '../GlobalEffects.js';
import { applyEntityOutlineFilter } from '../utils/highlightFilters.js';
import {
    shouldSpawnElite,
    pickEliteType,
    applyEliteStats,
    attachEliteAura,
    updateEliteAura,
    damagePlayerFromMob,
    ELITE_SIZE_MULT,
} from '../elite/eliteMobs.js';

/** Deterministic [0,1) from integer seed (matches world `seededRandom` style). */
export function mobSeededUnit(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

export function createMobController(mob, entityLayer) {
    let archetypeBehavior = null;
    const archetypeType = mob.archetype || ARCHETYPES.RUSHER;

    const ArchetypeClass = archetypeMap[archetypeType];
    if (ArchetypeClass) {
        archetypeBehavior = new ArchetypeClass(mob, entityLayer);
    }

    // === Patrol + Aggro System ===
    const spawnX = mob.x;
    const spawnY = mob.y;

    const AGGRO_RADIUS = 420;
    const RETURN_RADIUS = 620;
    const PATROL_RADIUS = 130;

    let state = 'PATROL';
    let patrolTargetX = mob.x;
    let patrolTargetY = mob.y;
    let lastPatrolChange = performance.now();

    return {
        mob,
        archetype: archetypeBehavior,
        archetypeType,

        update(ctx) {
            if (!mob?.c) return;

            const { px, py, colliders, openWorld, mobs, dt = 1 } = ctx;
            const m = this.mob;
            const time = performance.now();

            mob.c.zIndex = mob.y;

            const distToPlayer = Math.hypot(px - m.x, py - m.y);
            if (distToPlayer > MOB_SIM_RADIUS) return;

            // Status effects (DoT must trigger death — arrows skip hp <= 0 targets)
            const lethalDot = updateStatusEffects(m, dt, performance.now(), (damage, type) => {
                let icon = '🔥', color = '#ff6600';
                if (type === 'poison') { icon = '💚'; color = '#88ff88'; }
                else if (type === 'ice') { icon = '❄️'; color = '#88ccff'; }
                else if (type === 'bleed') { icon = '🩸'; color = '#ff4444'; }
                VFX.addFloat(`${icon} ${Math.floor(damage)}`, m.x, m.y - 20, color);
            });

            if (lethalDot || m.hp <= 0) {
                updateMobHealthBar(m);
                const idx = mobs?.indexOf(m) ?? -1;
                openWorld?.killMob?.(m, idx);
                return;
            }

            if (archetypeBehavior?.groundAttacks) {
                archetypeBehavior.groundAttacks.update(ctx.px, ctx.py, (damage) => {
                    damagePlayerFromMob(m, damage, 'tank slam');
                }, dt);
            }

            if (m.isElite) {
                updateEliteAura(m, dt);
            }

            let moveX = 0, moveY = 0;
            let attackOverride = false;

            // ====================== STATE MACHINE ======================
            if (state === 'PATROL') {
                if (distToPlayer < AGGRO_RADIUS) {
                    state = 'CHASE';
                }
            } else if (state === 'CHASE') {
                if (distToPlayer > RETURN_RADIUS) {
                    state = 'PATROL';
                    patrolTargetX = m.x;
                    patrolTargetY = m.y;
                    lastPatrolChange = time;
                }
            }

            // ====================== MOVEMENT ======================
            if (state === 'CHASE') {
                // Direct chase
                const dx = px - m.x;
                const dy = py - m.y;
                const len = Math.hypot(dx, dy) || 1;
                const speed = m.speed || 5;

                moveX = (dx / len) * speed;
                moveY = (dy / len) * speed;

            } else {
                // PATROL
                if (time - lastPatrolChange > 2200 ||
                    Math.hypot(m.x - patrolTargetX, m.y - patrolTargetY) < 25) {

                    const rng = mob.spawnRngSeed ?? ((Math.floor(m.x * 73856093) ^ Math.floor(m.y * 19349663)) | 0);
                    mob._patrolStep = (mob._patrolStep || 0) + 1;
                    const s = rng ^ (mob._patrolStep * 0x9e3779b9);
                    const angle = mobSeededUnit(s) * Math.PI * 2;
                    const dist = 40 + mobSeededUnit(s + 11111) * PATROL_RADIUS;
                    patrolTargetX = spawnX + Math.cos(angle) * dist;
                    patrolTargetY = spawnY + Math.sin(angle) * dist;
                    lastPatrolChange = time;
                }

                const dx = patrolTargetX - m.x;
                const dy = patrolTargetY - m.y;
                const len = Math.hypot(dx, dy) || 1;
                const speed = (m.speed || 5) * 0.65;

                moveX = (dx / len) * speed;
                moveY = (dy / len) * speed;
            }

            const useArchetypeAi =
                archetypeBehavior?.update &&
                (state === 'CHASE' || archetypeType === ARCHETYPES.BAT);

            if (useArchetypeAi) {
                const result = archetypeBehavior.update({
                    ...ctx,
                    dt,
                    isChasing: state === 'CHASE',
                    mobState: state,
                });
                if (result.moveX !== undefined) moveX = result.moveX;
                if (result.moveY !== undefined) moveY = result.moveY;
                attackOverride = result.attackOverride || false;
            }

            // ====================== APPLY MOVEMENT ======================
            if (moveX !== 0 || moveY !== 0) {
                const slow = m.statusSlow || 0;
                const speedMult = 1 - slow;
                const fs = frameScale(dt);

                let newX = m.x + moveX * speedMult * fs;
                let newY = m.y + moveY * speedMult * fs;

                // World bounds
                if (openWorld) {
                    const bounds = openWorld.getCurrentBounds();
                    if (bounds) {
                        newX = Math.max(bounds.minX + MOB_RADIUS, Math.min(bounds.maxX - MOB_RADIUS, newX));
                        newY = Math.max(bounds.minY + MOB_RADIUS, Math.min(bounds.maxY - MOB_RADIUS, newY));
                    }
                }

                // Mob vs Mob
                if (mobs?.length) {
                    for (const other of mobs) {
                        if (other === m) continue;
                        const dist = Math.hypot(newX - other.x, newY - other.y);
                        if (dist < MOB_RADIUS * 2) {
                            const angle = Math.atan2(newY - other.y, newX - other.x);
                            newX = other.x + Math.cos(angle) * MOB_RADIUS * 2;
                            newY = other.y + Math.sin(angle) * MOB_RADIUS * 2;
                        }
                    }
                }

                // Prop collision
                if (colliders?.length) {
                    const validColliders = colliders.filter(c => c?.collision && c.width && c.height);
                    if (validColliders.length) {
                        const resolved = resolveVsColliders(newX, newY, MOB_RADIUS, validColliders);
                        newX = resolved.x;
                        newY = resolved.y;
                    }
                }

                m.x = newX;
                m.y = newY;
                m.c.x = newX;
                m.c.y = newY;
            }

            if (m._batPendingMelee) {
                m._batPendingMelee = false;
                damagePlayerFromMob(m, m.damage, 'bat strike');
                m.attackCooldown = Math.max(0.35, 1 / (m.attackSpeed || 1));
            }

            // Attack only when chasing
            if (!attackOverride && state === 'CHASE') {
                this.handleAttack({ distToPlayer, dt });
            }

            updateMobHealthBar(m);
            applyEntityOutlineFilter(m.body, m, state === 'CHASE');
            if (!mob.isCasting && archetypeType !== ARCHETYPES.BAT) {
                applyBreathing(mob, performance.now() * 0.003);
                setFacingDirection(mob, moveX || (px - m.x));
            }
        },

        handleAttack({ distToPlayer, dt }) {
            const m = this.mob;
            m.attackCooldown = Math.max(0, (m.attackCooldown || 0) - dt);

            if (distToPlayer < 26 && m.attackCooldown <= 0) {
                damagePlayerFromMob(m, m.damage, `${this.archetypeType} atk`);
                m.attackCooldown = Math.max(0.2, 1 / (m.attackSpeed || 1));
            }
        },

        getState: () => state,
        forceChase: () => { state = 'CHASE'; }
    };
}



export function spawnMob(renderer, world, x, y, biome = 'forest', archetype = null, difficulty = 1, spawnSeed) {
    const rng =
        spawnSeed != null && Number.isFinite(spawnSeed)
            ? spawnSeed | 0
            : ((Math.floor(x * 73856093) ^ Math.floor(y * 19349663)) | 0);

    let finalArchetype = archetype;
    if (!finalArchetype || !ARCHETYPE_STATS[finalArchetype]) {
        finalArchetype = pickSpawnArchetype(mobSeededUnit(rng ^ 0xbeeff00d), biome);
    }

    const stats = ARCHETYPE_STATS[finalArchetype];
    const eliteRoll = shouldSpawnElite(difficulty, mobSeededUnit(rng ^ 0x51a7e11e));
    const eliteType = eliteRoll ? pickEliteType(rng) : null;
    const size = eliteRoll ? stats.size * ELITE_SIZE_MULT : stats.size;

    const { c, bodyC, uiC, body, eye, hpBar } = createMobEntity(renderer, biome, size, null, stats.type);
    c.x = x;
    c.y = y;
    c.sortableChildren = true;

    world.addChild(c);

    const scaled = applyMobDifficulty(stats, difficulty);
    const contentScales = getWorldContentScales(difficulty);

    const mob = {
        c, bodyC, uiC, body, eye, hpBar,
        shapeDef: stats.type,
        worldDifficulty: difficulty,
        lootMultiplier: contentScales.lootMultiplier,
        x, y,
        hp: scaled.hp,
        maxHp: scaled.hp,
        speed: scaled.speed,
        damage: scaled.damage,
        attackSpeed: scaled.attackSpeed,
        attackCooldown: 0,
        exp: getMobExpReward(difficulty, stats.exp),
        animOffset: mobSeededUnit(rng ^ 0xdeadbeef) * 1000,
        spawnRngSeed: rng,
        _patrolStep: 0,
        // Core identifiers
        archetype: finalArchetype,
        biome,
        size,
        archetypeData: {},
        isElite: false,
        eliteType: null,
        type: 'mob',
    };

    if (eliteType) {
        applyEliteStats(mob, eliteType, stats.exp, difficulty);
        attachEliteAura(mob, eliteType);
    }

    applyArchetypeVisuals(mob, finalArchetype, biome);

    attachMonsterLevelUi(mob, difficulty, {
        barHalfWidth: size + 2,
        barY: -(size + 14),
        eliteType: mob.eliteType,
    });

    mob.controller = createMobController(mob, world);

    return mob;
}

export function updateMobHealthBar(m) {
    if (!m?.hpBar) return;

    const pct = Math.max(0, m.hp / m.maxHp);

    if (m.levelUi) {
        drawMonsterHpWithLevel(m, pct);
        return;
    }

    const size = m.size || 13;
    m.hpBar.clear();

    if (pct > 0) {
        const color = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        const barY = m.c?.userData?.barY || -size - 13;
        m.hpBar.rect(-size - 2, barY + 1, (size * 2 + 4) * pct, 3).fill(color);
    }
}

export function applyBreathing(mob, globalTime) {
    const bodyC = mob.bodyC ?? mob.c;
    if (!bodyC) return;

    const offset = mob.animOffset || 0;
    const breath = Math.sin(globalTime + offset) * 0.5;
    const facing = bodyC.scale.x < 0 ? -1 : 1;

    bodyC.scale.x = facing * (1 + breath * 0.15);
    bodyC.scale.y = 1 - breath * 0.08;
}

export function setFacingDirection(mob, vx) {
    const bodyC = mob.bodyC ?? mob.c;
    if (!bodyC) return;

    if (vx < -0.01 && bodyC.scale.x > 0) {
        bodyC.scale.x *= -1;
    } else if (vx > 0.01 && bodyC.scale.x < 0) {
        bodyC.scale.x *= -1;
    }
}