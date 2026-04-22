import { Graphics } from 'pixi.js';

import { nearbyColliders } from './props.js';

export function resolveVsColliders(nx, ny, radius, colliders) {
    let rx = nx, ry = ny;

    // Only test colliders close enough to matter
    const nearby = nearbyColliders(colliders, nx, ny, 200);

    for (const col of nearby) {
        const dx  = rx - col.x;
        const dy  = ry - col.y;
        const d   = Math.sqrt(dx * dx + dy * dy);
        const min = radius + col.r;
        if (d < min && d > 0.001) {
            const push = (min - d) / d;
            rx += dx * push;
            ry += dy * push;
        }
    }
    return { x: rx, y: ry };
}

export function isColliding(x, y, radius, colliders) {
    for (const col of colliders) {
        const dx = x - col.x;
        const dy = y - col.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < radius + col.r) return true;
    }
    return false;
}

export function getClosestCollider(x, y, colliders) {
    let closest = null, minDist = Infinity;
    for (const col of colliders) {
        const dx = x - col.x, dy = y - col.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) { minDist = dist; closest = col; }
    }
    return closest;
}

export function drawDebugColliders(world, colliders) {
    if (window._debugGraphics) {
        world.removeChild(window._debugGraphics);
        window._debugGraphics.destroy();
    }
    const g = new Graphics();
    colliders.forEach(col => {
        if (col.r !== undefined) {
            g.circle(col.x, col.y, col.r).stroke({ width: 2, color: 0xff0000, alpha: 0.8 });
            g.circle(col.x, col.y, 3).fill({ color: 0xff0000, alpha: 0.8 });
        }
    });
    world.addChild(g);
    window._debugGraphics = g;
    return g;
}

/**
 * Creates a debug toggle bound to F2. Call once during setup.
 */
export function createDebugColliderToggle(world, colliders) {
    let debugGraphics = null;

    function toggle() {
        if (debugGraphics) {
            world.removeChild(debugGraphics);
            debugGraphics = null;
        } else {
            debugGraphics = drawDebugColliders(world, colliders);
        }
    }

    const handler = e => { if (e.key === 'F2') toggle(); };
    window.addEventListener('keydown', handler);

    return {
        /** Call each tick only if active, to redraw when colliders change */
        tickUpdate() {
            if (debugGraphics) {
                world.removeChild(debugGraphics);
                debugGraphics = drawDebugColliders(world, colliders);
            }
        },
        destroy() { window.removeEventListener('keydown', handler); }
    };
}