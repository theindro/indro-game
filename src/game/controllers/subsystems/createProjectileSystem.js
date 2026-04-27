// controllers/subsystems/createProjectileSystem.js
import {burst} from "../../utils/particles.js";
import {useGameStore} from "../../../stores/gameStore.js";

export function createProjectileSystem(ctx) {
    const { entityLayer, particles, enemyProjs, openWorld } = ctx;

    function updateEnemyProjs(px, py) {
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
                            burst(entityLayer, particles, ep.c.x, ep.c.y, 0xff6666, 6, 2);
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


    return { updateEnemyProjs };
}