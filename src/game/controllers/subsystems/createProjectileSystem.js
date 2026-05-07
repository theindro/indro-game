// controllers/subsystems/createProjectileSystem.js
import {useGameStore} from "../../../stores/gameStore.js";
import {VFX} from "../../GlobalEffects.js";

export function createProjectileSystem(ctx) {
    const { enemyProjs, openWorld } = ctx;

    function updateEnemyProjs(px, py) {
        for (let ei = enemyProjs.length - 1; ei >= 0; ei--) {
            const ep = enemyProjs[ei];
            ep.c.x += ep.vx;
            ep.c.y += ep.vy;

            // Update arrow zindex
            ep.c.zIndex = ep.c.y;

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

            if (ctx.colliders?.length && ep?.c && ep.c.parent) {
                for (const collider of ctx.colliders) {
                    if (!collider?.collision || !collider.width || !collider.height) continue;

                    const hit =
                        ep.c.x >= collider.x - collider.width / 2 &&
                        ep.c.x <= collider.x + collider.width / 2 &&
                        ep.c.y >= collider.y - collider.height / 2 &&
                        ep.c.y <= collider.y + collider.height / 2;

                    if (hit) {
                        VFX.burst(ep.c.x, ep.c.y, 0xff6666, 6, 2);

                        if (ep.c.parent) {
                            ep.c.parent.removeChild(ep.c);
                        }
                        ep.c.destroy();

                        enemyProjs.splice(ei, 1);

                        hitProp = true;
                        break;
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