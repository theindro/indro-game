// collision.js (updated with additional helpers)
import { Graphics } from "pixi.js";

/**
 * Resolves a circular entity against an array of circular colliders.
 * @param {number} nx          - proposed x position
 * @param {number} ny          - proposed y position
 * @param {number} radius      - entity radius
 * @param {Array}  colliders   - array of {x, y, r}
 * @returns {{ x: number, y: number }}
 */
export function resolveVsColliders(nx, ny, radius, colliders) {
    let rx = nx, ry = ny;
    for (const col of colliders) {
        const dx = rx - col.x;
        const dy = ry - col.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        const min = radius + col.r;
        if (d < min && d > 0.001) {
            const push = (min - d) / d;
            rx += dx * push;
            ry += dy * push;
        }
    }
    return { x: rx, y: ry };
}

/**
 * Checks if a position is colliding with any collider
 * @param {number} x - x position to check
 * @param {number} y - y position to check
 * @param {number} radius - entity radius
 * @param {Array} colliders - array of {x, y, r}
 * @returns {boolean} - true if colliding
 */
export function isColliding(x, y, radius, colliders) {
    for (const col of colliders) {
        const dx = x - col.x;
        const dy = y - col.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < radius + col.r) {
            return true;
        }
    }
    return false;
}

/**
 * Gets the closest collider to a position
 * @param {number} x - x position
 * @param {number} y - y position
 * @param {Array} colliders - array of {x, y, r}
 * @returns {Object|null} - closest collider or null
 */
export function getClosestCollider(x, y, colliders) {
    let closest = null;
    let minDist = Infinity;

    for (const col of colliders) {
        const dx = x - col.x;
        const dy = y - col.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            closest = col;
        }
    }

    return closest;
}

// Add this function to your collision.js or create a new debug.js file
export function drawDebugColliders(world, colliders) {
    // Remove existing debug graphics if any
    if (window._debugGraphics) {
        world.removeChild(window._debugGraphics);
        window._debugGraphics.destroy();
    }

    const debugGraphics = new Graphics();

    colliders.forEach(col => {
        if (col.r !== undefined) {
            // Draw circle outline
            debugGraphics.circle(col.x, col.y, col.r)
                .stroke({ width: 2, color: 0xff0000, alpha: 0.8 });

            // Draw center point
            debugGraphics.circle(col.x, col.y, 3)
                .fill({ color: 0xff0000, alpha: 0.8 });
        }
    });

    world.addChild(debugGraphics);
    window._debugGraphics = debugGraphics;
    return debugGraphics;
}