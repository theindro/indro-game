import { Graphics } from 'pixi.js';

import { nearbyColliders } from './props.js';

// Add to collision.js
export function resolveVsColliders(nx, ny, radius, colliders) {
    let rx = nx, ry = ny;
    const nearby = nearbyColliders(colliders, nx, ny, 200);

    for (const col of nearby) {
        if (col.type === 'box') {
            // Box collision resolution
            const halfW = col.width / 2;
            const halfH = col.height / 2;

            // Find closest point on box
            const closestX = Math.max(col.x - halfW, Math.min(rx, col.x + halfW));
            const closestY = Math.max(col.y - halfH, Math.min(ry, col.y + halfH));

            const dx = rx - closestX;
            const dy = ry - closestY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                const push = (radius - dist) / dist;
                rx += dx * push;
                ry += dy * push;
            }
        } else if (col.r !== undefined) {
            // Circle collision (existing)
            const dx = rx - col.x;
            const dy = ry - col.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const min = radius + col.r;
            if (d < min && d > 0.001) {
                const push = (min - d) / d;
                rx += dx * push;
                ry += dy * push;
            }
        }
    }
    return { x: rx, y: ry };
}

// Add helper for prop damage on touch
export function applyPropDamage(player, colliders, playerRadius) {
    for (const col of colliders) {
        if (col.damageOnTouch && col.type === 'prop') {
            const dx = player.x - col.x;
            const dy = player.y - col.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < playerRadius + col.r) {
                return { damage: col.damageOnTouch, tickRate: col.damageTick };
            }
        }
    }
    return null;
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

// collision.js - Add open world bounds (optional world border)
export function clampToWorld(x, y, r = 0, worldSize = 5000) {
    return {
        x: Math.max(-worldSize + r, Math.min(worldSize - r, x)),
        y: Math.max(-worldSize + r, Math.min(worldSize - r, y))
    };
}