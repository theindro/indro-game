import {Graphics} from 'pixi.js';
import {useGameStore} from "../../stores/gameStore.js";

// SIMPLE RECTANGLE COLLISION ONLY
export function resolveVsColliders(nx, ny, radius, colliders) {
    let rx = nx;
    let ry = ny;

    for (const col of colliders) {
        if (!col || !col.collision) continue;

        const halfW = col.width * 0.5;
        const halfH = col.height * 0.5;

        const left = col.x - halfW;
        const right = col.x + halfW;
        const top = col.y - halfH;
        const bottom = col.y + halfH;

        // closest point on AABB
        const closestX = Math.max(left, Math.min(rx, right));
        const closestY = Math.max(top, Math.min(ry, bottom));

        let dx = rx - closestX;
        let dy = ry - closestY;

        const distSq = dx * dx + dy * dy;
        const minDist = radius;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.0001;

            const push = (minDist - dist) / dist;

            rx += dx * push;
            ry += dy * push;
        }
    }

    return {x: rx, y: ry};
}

export function drawDebugColliders(world, colliders) {
    if (window._debugGraphics) {
        world.removeChild(window._debugGraphics);
        window._debugGraphics.destroy();
    }
    const g = new Graphics();
    colliders.forEach(col => {
        if (!col.collision) return;

        const x = col.x - col.width / 2;
        const y = col.y - col.height / 2;

        // Draw rectangle
        g.rect(x, y, col.width, col.height)
            .stroke({width: 2, color: 0xff0000, alpha: 0.8});
        g.rect(x, y, col.width, col.height)
            .fill({color: 0xff0000, alpha: 0.1});
        // Draw center point
        g.circle(col.x, col.y, 3).fill({color: 0x00ff00, alpha: 0.8});
    });
    world.addChild(g);
    window._debugGraphics = g;
    return g;
}

export function createDebugColliderToggle(world, colliders, getMobs = null) {
    let debugGraphics = null;

    function draw() {
        if (debugGraphics) {
            world.removeChild(debugGraphics);
            debugGraphics.destroy();
        }

        debugGraphics = new Graphics();

        colliders.forEach(col => {
            if (!col.collision) return;

            const x = col.x - col.width / 2;
            const y = col.y - col.height / 2;

            debugGraphics
                .rect(x, y, col.width, col.height)
                .stroke({ width: 2, color: 0xff0000, alpha: 0.8 });

            debugGraphics
                .rect(x, y, col.width, col.height)
                .fill({ color: 0xff0000, alpha: 0.1 });

            debugGraphics.circle(col.x, col.y, 3)
                .fill({ color: 0x00ff00, alpha: 0.8 });
        });

        if (typeof getMobs === 'function') {
            const mobs = getMobs() || [];
            for (const mob of mobs) {
                if (!mob || mob.hp <= 0) continue;
                const r = mob.size ?? 16;
                debugGraphics.circle(mob.x, mob.y, r)
                    .stroke({ width: 2, color: 0x00ffff, alpha: 0.9 });
                debugGraphics.circle(mob.x, mob.y, 3)
                    .fill({ color: 0x00ffff, alpha: 0.8 });
            }
        }

        world.addChild(debugGraphics);
    }

    return {
        tickUpdate() {
            const enabled = useGameStore.getState().debug.enabled;

            if (!enabled) {
                if (debugGraphics) {
                    world.removeChild(debugGraphics);
                    debugGraphics.destroy();
                    debugGraphics = null;
                }
                return;
            }

            draw();
        },

        destroy() {
            if (debugGraphics) debugGraphics.destroy();
        }
    };
}
