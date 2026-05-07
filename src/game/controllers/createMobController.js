import {DIFFICULTY, GS, MOB_HP, MOB_RADIUS} from "../constants.js";
import {useGameStore} from "../../stores/gameStore.js";
import {createMobEntity} from "../entities/createMobEntity.js";
import {resolveVsColliders} from "../world/collision.js";
import { ARCHETYPES, archetypeMap, ARCHETYPE_STATS, applyArchetypeVisuals } from './mobArchetypes/index.js';
import {updateStatusEffects} from "../statusEffects.js";
import {VFX} from '../GlobalEffects.js';

export function createMobController(mob, entityLayer) {
    let archetypeBehavior = null;
    const archetypeType = mob.archetype || ARCHETYPES.RUSHER;

    // Initialize archetype behavior
    const ArchetypeClass = archetypeMap[archetypeType];
    if (ArchetypeClass) {
        archetypeBehavior = new ArchetypeClass(mob, entityLayer);
    }

    return {
        mob,
        archetype: archetypeBehavior,
        archetypeType,

        update(ctx) {
            if (!mob?.c) return;

            const { px, py, colliders, openWorld, mobs, dt = 1 } = ctx;

            // Update zIndex for correct rendering order
            mob.c.zIndex = mob.y;

            const m = this.mob;
            const distToPlayer = Math.hypot(px - m.x, py - m.y);

            // Status effects (DOTs, etc.)
            updateStatusEffects(m, dt, performance.now(), (damage, type) => {
                let icon = '🔥';
                let color = '#ff6600';

                if (type === 'poison') { icon = '💚'; color = '#88ff88'; }
                else if (type === 'ice') { icon = '❄️'; color = '#88ccff'; }
                else if (type === 'bleed') { icon = '🩸'; color = '#ff4444'; }

                VFX.addFloat(`${icon} ${Math.floor(damage)}`, m.x, m.y - 20, color);
            });

            // Performance culling
            if (distToPlayer > 1500) return;

            // Archetype movement
            let moveX = 0, moveY = 0;
            let attackOverride = false;

            if (archetypeBehavior?.update) {
                const result = archetypeBehavior.update({ ...ctx, dt });
                moveX = result.moveX || 0;
                moveY = result.moveY || 0;
                attackOverride = result.attackOverride || false;
            }

            // Apply movement
            if (moveX !== 0 || moveY !== 0) {
                const slow = m.statusSlow || 0;
                const speedMult = 1 - slow;

                let newX = m.x + moveX * speedMult;
                let newY = m.y + moveY * speedMult;

                // World bounds
                if (openWorld) {
                    const bounds = openWorld.getCurrentBounds();
                    if (bounds) {
                        newX = Math.max(bounds.minX + MOB_RADIUS, Math.min(bounds.maxX - MOB_RADIUS, newX));
                        newY = Math.max(bounds.minY + MOB_RADIUS, Math.min(bounds.maxY - MOB_RADIUS, newY));
                    }
                }

                // Mob vs Mob collision
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

            // Attack
            if (!attackOverride) {
                this.handleAttack({ distToPlayer, dt });
            }

            // Health bar
            updateMobHealthBar(m);
        },

        handleAttack({ distToPlayer, dt }) {
            const m = this.mob;
            m.attackCooldown = Math.max(0, m.attackCooldown - dt);

            if (distToPlayer < 26 && m.attackCooldown <= 0) {
                useGameStore.getState().damagePlayer(m.damage, `${this.archetypeType} atk`);
                m.attackCooldown = Math.max(0.2, 1 / m.attackSpeed);
            }
        },
    };
}

export function spawnMob(world, x, y, biome = 'forest', archetype = null, difficulty = 1) {
    const finalArchetype = archetype || Object.values(ARCHETYPES)[Math.floor(Math.random() * Object.values(ARCHETYPES).length)];

    const stats = ARCHETYPE_STATS[finalArchetype];
    const size = stats.size;

    const { c, body, gl, hpBar } = createMobEntity(biome, size);
    c.x = x;
    c.y = y;
    c.sortableChildren = true;

    world.addChild(c);

    // Base stats
    const baseHp = MOB_HP * stats.hpMultiplier * difficulty;
    const baseSpeed = 0.78 * stats.speedMultiplier * (1 + Math.min(difficulty * 0.05, 0.5));
    const baseAtkSpeed = DIFFICULTY.attackCooldown * (1 + difficulty * 0.1);
    const damageScale = 1 + Math.log2(difficulty + 1) * 0.35;

    const mob = {
        c, body, gl, hpBar,
        x, y,
        hp: baseHp,
        maxHp: baseHp,
        speed: baseSpeed,
        damage: Math.round(stats.damage * damageScale),
        attackSpeed: baseAtkSpeed,
        attackCooldown: 0,
        exp: stats.exp,

        // Core identifiers
        archetype: finalArchetype,
        biome,
        size,
        archetypeData: {}
    };

    applyArchetypeVisuals(mob, finalArchetype, biome);

    mob.controller = createMobController(mob, world);

    return mob;
}

export function updateMobHealthBar(m) {
    if (!m?.hpBar) return;

    const size = m.size || 13;
    const pct = Math.max(0, m.hp / m.maxHp);

    m.hpBar.clear();

    if (pct > 0) {
        const color = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        const barY = m.c?.userData?.barY || -size - 13;

        m.hpBar.rect(-size - 2, barY + 1, (size * 2 + 4) * pct, 3).fill(color);
    }
}