import {DIFFICULTY, GS, ICE_MOB_SHOOT_INTERVAL_BASE, MOB_HP, MOB_RADIUS} from "../constants.js";
import {useGameStore} from "../../stores/gameStore.js";
import {createMobEntity} from "../entities/createMobEntity.js";
import {resolveVsColliders} from "../world/collision.js";
import { ARCHETYPES, archetypeMap, ARCHETYPE_STATS, applyArchetypeVisuals } from './mobArchetypes/index.js';
import {updateStatusEffects} from "../statusEffects.js";
import {showFloat} from "../utils/floatText.js";

export function createMobController(mob) {
    let archetypeBehavior = null;
    let archetypeType = mob.archetype || ARCHETYPES.RUSHER;

    // Initialize archetype behavior
    const ArchetypeClass = archetypeMap[archetypeType];
    if (ArchetypeClass) {
        archetypeBehavior = new ArchetypeClass(mob, {});
    }

    return {
        mob,
        archetype: archetypeBehavior,
        archetypeType,

        update(ctx) {
            if (!mob || !mob.c) return;

            const {px, py, colliders, openWorld, mobs, dt = 1} = ctx;

            const m = this.mob;
            const distToPlayer = Math.hypot(px - m.x, py - m.y);

            // Every tick update status effect on boss
            updateStatusEffects(m, dt, performance.now(), (damage, type) => {
                // Show floating damage text for DOT effects
                let icon = '🔥';
                let color = '#ff6600';

                switch(type) {
                    case 'burn':
                        icon = '🔥';
                        color = '#ff6600';
                        break;
                    case 'poison':
                        icon = '💚';
                        color = '#88ff88';
                        break;
                    case 'freeze':
                        icon = '❄️';
                        color = '#88ccff';
                        break;
                    case 'bleed':
                        icon = '🩸';
                        color = '#ff4444';
                        break;
                }

                // Use the showFloat function from ctx
                // showFloat(ctx.floats, m.x, m.y - 20, `${icon} ${Math.floor(damage)}`, color);

            });

            // Performance optimization
            if (distToPlayer > 1500) return;

            // Get archetype-specific movement
            let moveX = 0, moveY = 0;
            let attackOverride = false;

            if (archetypeBehavior && archetypeBehavior.update) {
                const archetypeResult = archetypeBehavior.update({...ctx, dt});
                moveX = archetypeResult.moveX || 0;
                moveY = archetypeResult.moveY || 0;
                attackOverride = archetypeResult.attackOverride || false;
            } else {
                // Fallback to original movement logic
                // ... (keep your existing movement code as fallback)
            }

            // Apply movement with collision (same as before)
            if (moveX !== 0 || moveY !== 0) {

                // 🔥 APPLY SLOW HERE
                const slow = m.statusSlow || 0;
                const speedMultiplier = 1 - slow;

                let newX = m.x + moveX * speedMultiplier;
                let newY = m.y + moveY * speedMultiplier;

                // 1. world bounds
                if (openWorld) {
                    const bounds = openWorld.getCurrentBounds();
                    if (bounds) {
                        newX = Math.max(bounds.minX + MOB_RADIUS, Math.min(bounds.maxX - MOB_RADIUS, newX));
                        newY = Math.max(bounds.minY + MOB_RADIUS, Math.min(bounds.maxY - MOB_RADIUS, newY));
                    }
                }

                // 2. mob vs mob collision
                if (mobs && mobs.length) {
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

                // 3. ⭐ PROP COLLISION - FIXED VERSION
                if (colliders && colliders.length) {
                    // Make sure we're using the imported resolveVsColliders
                    // Ensure colliders have the right format (x, y, width, height)
                    const validColliders = colliders.filter(col => col && col.collision && col.width && col.height);

                    if (validColliders.length) {
                        const resolved = resolveVsColliders(
                            newX,
                            newY,
                            MOB_RADIUS,
                            validColliders
                        );
                        newX = resolved.x;
                        newY = resolved.y;
                    }
                }

                m.x = newX;
                m.y = newY;
                m.c.x = m.x;
                m.c.y = m.y;
            }

            // Attack handling based on archetype
            if (!attackOverride) {
                this.handleAttack({...ctx, distToPlayer});
            }

            // Bounce animation (modified for archetypes)
            this.updateAnimation(dt);

            // Update mob health bar every update
            updateMobHealthBar(m);
        },

        handleAttack(ctx) {
            const { distToPlayer, playerState } = ctx;
            const m = this.mob;

            // Archetype-specific damage
            let damage = 2; // base damage
            if (this.archetypeType === ARCHETYPES.RUSHER) damage = 3;
            if (this.archetypeType === ARCHETYPES.TANK) damage = 4;
            if (this.archetypeType === ARCHETYPES.EXPLODER) damage = 5;

            if (distToPlayer < 26 && m.attackCooldown <= 0) {
                useGameStore.getState().damagePlayer(damage, `${this.archetypeType} atk`);
                m.attackCooldown = this.getAttackCooldown();
            }

            if (m.attackCooldown > 0) m.attackCooldown--;
        },
        getAttackCooldown() {
            switch(this.archetypeType) {
                case ARCHETYPES.RUSHER: return 20;
                case ARCHETYPES.TANK: return 45;
                case ARCHETYPES.EXPLODER: return 60;
                default: return 30;
            }
        },
        updateAnimation(dt) {
            const m = this.mob;
            if (!m.c) return;

            m.bounceTime += (m.bounceSpeed || 0.08) * dt;
            const bounceY = Math.sin(m.bounceTime) * (m.bounceAmplitude || 2);
            m.c.y = m.y + bounceY;

            // Archetype-specific animations handled in their own classes
        },
        onDamage(amount, source, direction) {
            if (archetypeBehavior && archetypeBehavior.onDamage) {
                return archetypeBehavior.onDamage(amount, source);
            }
            return { damageMult: 1, knockbackMult: 1 };
        }
    };
}

// Updated spawnMob function
export function spawnMob(world, x, y, biome = null, archetype = null) {
    const finalBiome = biome || 'forest';
    // Random archetype selection if not specified
    const archetypesList = Object.values(ARCHETYPES);
    const finalArchetype = archetype || archetypesList[Math.floor(Math.random() * archetypesList.length)];

    const stats = ARCHETYPE_STATS[finalArchetype];
    const size = stats.size;

    const {c, body, gl, hpBar} = createMobEntity(finalBiome, size);
    c.x = x;
    c.y = y;
    world.addChild(c);

    const baseHp = (MOB_HP * DIFFICULTY.mobHp) * stats.hpMultiplier;
    const baseSpeed = (0.78 * DIFFICULTY.mobSpeed) * stats.speedMultiplier;

    const mob = {
        c, body, gl, hpBar,
        x, y,
        hp: baseHp,
        maxHp: baseHp,
        speed: baseSpeed + Math.random() * 0.2,
        hitFlash: 0,
        biome: finalBiome,
        archetype: finalArchetype,
        damage: stats.damage,
        knockbackResist: stats.knockbackResist,
        shootTimer: 0,
        bounceSpeed: 0.08 + Math.random() * 0.04,
        bounceTime: Math.random() * Math.PI * 2,
        originalY: y,
        bounceAmplitude: 2 + Math.random() * 2,
        scalePulse: 0,
        attackCooldown: 0,
        state: 'idle',
        patrolPoints: [],
        currentPatrolIndex: 0,
        spawnX: x,
        spawnY: y,
        size: size,
        // Archetype-specific properties
        archetypeData: {}
    };

    // Generate patrol points
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        mob.patrolPoints.push({
            x: mob.spawnX + Math.cos(angle) * 80,
            y: mob.spawnY + Math.sin(angle) * 80
        });
    }

    // Apply archetype visuals
    applyArchetypeVisuals(mob, finalArchetype, finalBiome);

    // Create controller
    mob.controller = createMobController(mob);

    return mob;
}

export function updateMobHealthBar(m) {
    if (!m || !m.hpBar) return;

    // Get the mob's size from its container or use default
    let size = m.size || 13;

    // Try to get size from container's userData if available
    if (m.c && m.c.userData && m.c.userData.size) {
        size = m.c.userData.size;
    }

    const pct = Math.max(0, m.hp / m.maxHp);

    m.hpBar.clear();

    if (pct > 0) {
        const col = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        const barY = m.c?.userData?.barY || -size - 13;
        m.hpBar.rect(-size - 2, barY + 1, (size * 2 + 4) * pct, 3).fill(col);
    }
}