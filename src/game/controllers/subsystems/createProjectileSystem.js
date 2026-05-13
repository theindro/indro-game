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

            const ud = ep.c.userData;

            if (ud) {

                ud.t += 1;

                // -----------------------------------
                // BASE PULSE
                // -----------------------------------
                const pulse =
                    1 +
                    Math.sin(ud.t * ud.pulseSpeed) * 0.08;

                if (ud.glowContainer) {
                    ud.glowContainer.scale.set(pulse);
                }

                // -----------------------------------
                // INNER GLOW FLICKER
                // -----------------------------------
                if (ud.glowInner) {
                    ud.glowInner.alpha =
                        0.18 +
                        Math.sin(ud.t * 0.2) * 0.08;
                }

                // -----------------------------------
                // PARTICLE ROTATION
                // -----------------------------------
                if (ud.particles) {
                    ud.particles.rotation += ud.rotationSpeed;
                }

                // -----------------------------------
                // ELEMENT SPECIFIC
                // -----------------------------------

                switch (ud.elementalType) {

                    case 'burn':

                        ep.c.scale.set(
                            1 + Math.sin(ud.t * 0.25) * 0.03
                        );

                        break;

                    case 'lightning':

                        ep.c.x += (Math.random() - 0.5) * 1.2;
                        ep.c.y += (Math.random() - 0.5) * 1.2;

                        if (ud.glowOuter) {
                            ud.glowOuter.alpha =
                                0.04 + Math.random() * 0.08;
                        }

                        break;

                    case 'poison':

                        if (ud.particles?.children) {

                            for (const p of ud.particles.children) {

                                p.y -= 0.15;

                                if (p.y < -14) {
                                    p.y = 14;
                                }

                                p.alpha =
                                    0.3 +
                                    Math.sin(ud.t * 0.08 + p.x) * 0.2;
                            }
                        }

                        break;
                }
            }

            ep.life--;

            // Check life and world bounds
            if (ep.life <= 0 || !openWorld.isInsideWorld(ep.c.x, ep.c.y)) {

                destroyProj(ep);

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

                        destroyProj(ep);

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

                destroyProj(ep);

                enemyProjs.splice(ei, 1);
            }
        }
    }

    function destroyProj(ep) {
        // Remove attached glow immediately
        if (ep.c.glow) {
            VFX.removeAttached(ep.c.glow);
        }
        if (ep.c.parent) {
            ep.c.parent.removeChild(ep.c);
        }
        ep.c.destroy({ children: true });
    }


    return { updateEnemyProjs };
}