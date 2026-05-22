import {Graphics} from 'pixi.js';
import {useGameStore} from "../../stores/gameStore.js";
import { resolveCircleVsLake } from './lakes/lakeGeometry.js';

/**
 * Push circle out of a rotated ellipse collider (lakes).
 */
function resolveVsEllipse(rx, ry, radius, col) {
    const halfW = col.width * 0.5;
    const halfH = col.height * 0.5;
    const rot = col.rotation ?? 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);

    const dx = rx - col.x;
    const dy = ry - col.y;
    const lx = dx * cos - dy * sin;
    const lz = dx * sin + dy * cos;

    const nx = halfW > 0 ? lx / halfW : 0;
    const nz = halfH > 0 ? lz / halfH : 0;
    const ellDist = Math.sqrt(nx * nx + nz * nz);

    const target = 1 + radius / Math.max(halfW, halfH, 1);

    if (ellDist >= target || ellDist < 0.0001) {
        return { x: rx, y: ry };
    }

    const scale = target / ellDist;
    const plx = lx * scale;
    const plz = lz * scale;
    const cosF = Math.cos(rot);
    const sinF = Math.sin(rot);
    const wx = col.x + plx * cosF - plz * sinF;
    const wy = col.y + plx * sinF + plz * cosF;

    return { x: wx, y: wy };
}

export function resolveVsColliders(nx, ny, radius, colliders) {
    let rx = nx;
    let ry = ny;

    for (const col of colliders) {
        if (!col || !col.collision) continue;
        if (col.blocksMovement === false) continue;

        if (col.isLakePolygon && col.shape) {
            const out = resolveCircleVsLake(rx, ry, radius, {
                x: col.x,
                z: col.z ?? col.y,
                rotation: col.rotation,
                shape: col.shape,
            });
            rx = out.x;
            ry = out.z;
            continue;
        }

        if (col.isEllipse) {
            const out = resolveVsEllipse(rx, ry, radius, col);
            rx = out.x;
            ry = out.y;
            continue;
        }

        const halfW = col.width * 0.5;
        const halfH = col.height * 0.5;

        const left = col.x - halfW;
        const right = col.x + halfW;
        const top = col.y - halfH;
        const bottom = col.y + halfH;

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
