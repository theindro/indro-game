import { PLAYER_RADIUS } from '../constants.js';
import { resolveVsColliders } from '../world/collision.js';

/**
 * @param {number} px
 * @param {number} py
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} maxRange
 * @param {import('../world/OpenWorldManager.js').OpenWorldManager | null} openWorld
 * @param {object[]} colliders
 */
export function resolveFireSlamLanding(px, py, targetX, targetY, maxRange, openWorld, colliders) {
    let dx = targetX - px;
    let dy = targetY - py;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRange && dist > 0) {
        const s = maxRange / dist;
        dx *= s;
        dy *= s;
    }

    let landX = px + dx;
    let landY = py + dy;

    if (openWorld?.clampToWorld) {
        const clamped = openWorld.clampToWorld(landX, landY, PLAYER_RADIUS);
        landX = clamped.x;
        landY = clamped.y;
    }

    const validColliders = (colliders ?? []).filter((c) => c?.collision && c.width && c.height);
    if (validColliders.length) {
        const resolved = resolveVsColliders(landX, landY, PLAYER_RADIUS, validColliders);
        landX = resolved.x;
        landY = resolved.y;
    }

    return { x: landX, y: landY };
}

/**
 * @param {string} abilityKey
 * @param {number} px
 * @param {number} py
 * @param {number} cursorX
 * @param {number} cursorY
 * @param {object} ability
 * @param {{ openWorld?: object, colliders?: object[] }} ctx
 */
export function resolveAbilityCastTarget(abilityKey, px, py, cursorX, cursorY, ability, ctx = {}) {
    const { openWorld, colliders } = ctx;

    switch (abilityKey) {
        case 'ability7': {
            const maxRange = ability.leapRange ?? 420;
            return resolveFireSlamLanding(px, py, cursorX, cursorY, maxRange, openWorld, colliders);
        }
        case 'ability3':
        case 'ability6':
            return { x: px, y: py };
        default:
            return { x: cursorX, y: cursorY };
    }
}
