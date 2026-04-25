import {DIFFICULTY, GS, ICE_MOB_SHOOT_INTERVAL_BASE, MOB_HP, MOB_RADIUS} from "../constants.js";
import {useGameStore} from "../../stores/gameStore.js";
import {createEnemyProj} from "../projectile.js";
import {getBiome} from "../biome.js";
import {createMobEntity} from "../entities/createMobEntity.js";
import {nearbyColliders} from "../props.js";

export function createMobController(mob) {
    let shootTimer = 0;

    return {
        mob,

        // In createMobController - replace the update function
        update(ctx) {
            if (!mob || !mob.c) return;

            const {
                px, py,
                colliders,
                openWorld,
                enemyProjs,
                playerState,
                shakeRef,
                mobs,
                world
            } = ctx;

            const m = this.mob;
            const distToPlayer = Math.hypot(px - m.x, py - m.y);

            // State machine for open world
            let moveX = 0, moveY = 0;

            if (distToPlayer < 500) {
                // Chase player
                m.state = 'chase';
                if (distToPlayer > 5) {
                    moveX = (px - m.x) / distToPlayer;
                    moveY = (py - m.y) / distToPlayer;
                }
            } else if (m.state === 'chase' && distToPlayer > 600) {
                m.state = 'patrol';
            } else if (m.state === 'idle') {
                m.state = 'patrol';
            }

            if (m.state === 'patrol' && m.patrolPoints && m.patrolPoints.length > 0) {
                const target = m.patrolPoints[m.currentPatrolIndex];
                if (target) {
                    const dx = target.x - m.x;
                    const dy = target.y - m.y;
                    const patrolDist = Math.hypot(dx, dy);

                    if (patrolDist < 20) {
                        m.currentPatrolIndex = (m.currentPatrolIndex + 1) % m.patrolPoints.length;
                    } else if (patrolDist > 0.01) {
                        moveX = dx / patrolDist;
                        moveY = dy / patrolDist;
                    }
                }
            }

            // Apply movement
            if (moveX !== 0 || moveY !== 0) {
                const speed = m.speed;
                let newX = m.x + moveX * speed;
                let newY = m.y + moveY * speed;

                // Keep within world bounds and resolve collisions
                if (openWorld) {
                    const bounds = openWorld.getCurrentBounds();
                    if (bounds) {
                        newX = Math.max(bounds.minX + MOB_RADIUS, Math.min(bounds.maxX - MOB_RADIUS, newX));
                        newY = Math.max(bounds.minY + MOB_RADIUS, Math.min(bounds.maxY - MOB_RADIUS, newY));
                    }
                }

                // Check collision with other mobs
                if (mobs && mobs.length) {
                    for (const other of mobs) {
                        if (other === m) continue;
                        const dist = Math.hypot(newX - other.x, newY - other.y);
                        if (dist < MOB_RADIUS * 2) {
                            // Push away
                            const angle = Math.atan2(newY - other.y, newX - other.x);
                            newX = other.x + Math.cos(angle) * MOB_RADIUS * 2;
                            newY = other.y + Math.sin(angle) * MOB_RADIUS * 2;
                        }
                    }
                }

                // In createMobController.js, enhance the collision section:
// Check collision with props
                if (colliders) {
                    const nearbyProps = nearbyColliders(colliders, newX, newY, MOB_RADIUS + 50);
                    for (const prop of nearbyProps) {
                        if (prop.type === 'prop' || prop.type === 'box') {
                            if (prop.r) {
                                const dx = newX - prop.x;
                                const dy = newY - prop.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < MOB_RADIUS + prop.r) {
                                    const angle = Math.atan2(dy, dx);
                                    newX = prop.x + Math.cos(angle) * (MOB_RADIUS + prop.r);
                                    newY = prop.y + Math.sin(angle) * (MOB_RADIUS + prop.r);
                                }
                            } else if (prop.width && prop.height) {
                                // Box collision for mobs
                                const halfW = prop.width / 2;
                                const halfH = prop.height / 2;
                                const closestX = Math.max(prop.x - halfW, Math.min(newX, prop.x + halfW));
                                const closestY = Math.max(prop.y - halfH, Math.min(newY, prop.y + halfH));
                                const dx = newX - closestX;
                                const dy = newY - closestY;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < MOB_RADIUS) {
                                    const angle = Math.atan2(dy, dx);
                                    newX = closestX + Math.cos(angle) * MOB_RADIUS;
                                    newY = closestY + Math.sin(angle) * MOB_RADIUS;
                                }
                            }
                        }
                    }
                }

                m.x = newX;
                m.y = newY;
                m.c.x = m.x;
                m.c.y = m.y;
            }

            // Bounce animation
            m.bounceTime += m.bounceSpeed;
            const bounceY = Math.sin(m.bounceTime) * m.bounceAmplitude;
            m.c.y = m.y + bounceY;

            // Contact damage
            if (distToPlayer < 26 && playerState) {
                if (m.attackCooldown <= 0) {
                    useGameStore.getState().damagePlayer(2, 'mob atk');
                    m.attackCooldown = 30;
                }
            }

            if (m.attackCooldown > 0) {
                m.attackCooldown--;
            }

            // Shooting for ice mobs
            m.shootTimer++;
            if (m.biome === 'ice' && distToPlayer > 90 && distToPlayer < 380 &&
                m.shootTimer > ICE_MOB_SHOOT_INTERVAL_BASE && world && enemyProjs) {
                m.shootTimer = 0;
                enemyProjs.push(createEnemyProj(world, m.x, m.y, px, py, 'ice', 5, 2.5, 6));
            }

            updateMobBar(m, 13);
        }
    };
}

// controllers/createMobController.js - Updated spawnMob
export function spawnMob(world, x, y, biome = null) {
    const finalBiome = biome || getBiome(x, y) || 'forest';
    const {c, body, gl, hpBar} = createMobEntity(finalBiome, 13);

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
        speed: baseSpeed + Math.random() * 0.4,
        hitFlash: 0,
        biome: finalBiome,
        shootTimer: 0,
        bounceSpeed: 0.08 + Math.random() * 0.04,
        bounceTime: Math.random() * Math.PI * 2,
        originalY: y,
        bounceAmplitude: 2 + Math.random() * 2,
        scalePulse: 0,
        attackCooldown: 0,
        // Add these for open world
        state: 'idle',
        patrolPoints: [],
        currentPatrolIndex: 0,
        spawnX: x,
        spawnY: y
    };

    // Generate patrol points for open world
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        mob.patrolPoints.push({
            x: mob.spawnX + Math.cos(angle) * 80,
            y: mob.spawnY + Math.sin(angle) * 80
        });
    }

    // Create the controller AFTER mob is fully defined
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
