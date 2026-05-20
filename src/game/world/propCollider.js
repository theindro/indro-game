/**
 * Prop collision boxes for world movement (see collision.js — center-based AABB).
 *
 * collisionType:
 * - `auto` — box from sprite bounds (×0.85), vertically centered on foot
 * - `rect` — fixed box at foot (bottom-center), default 50×50
 * - `none` — no collider
 */

const DEFAULT_RECT_SIZE = 50;

/**
 * @param {number} footX Prop foot world X (sprite anchor 0.5, 1).
 * @param {number} footZ Prop foot world Y / Z.
 * @param {import('pixi.js').Sprite | import('pixi.js').Graphics} propVisual
 * @param {object | null | undefined} propType Entry from PROP_TYPES
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function computePropColliderBounds(footX, footZ, propVisual, propType) {
    const collisionType = propType?.collisionType ?? 'auto';

    if (collisionType === 'none') {
        return null;
    }

    if (collisionType === 'rect') {
        const width = propType?.rectWidth ?? DEFAULT_RECT_SIZE;
        const height = propType?.rectHeight ?? DEFAULT_RECT_SIZE;
        return {
            x: footX,
            y: footZ - height / 2,
            width,
            height,
        };
    }

    const baseWidth = Math.max(20, Math.abs(propVisual?.width) || 30);
    const baseHeight = Math.max(20, Math.abs(propVisual?.height) || 30);
    const width = baseWidth * 0.85;
    const height = baseHeight * 0.85;

    return {
        x: footX,
        y: footZ - height / 2,
        width,
        height,
    };
}

/**
 * @param {boolean | undefined} wantsCollision
 * @param {object | null | undefined} propType
 */
export function shouldCreatePropCollider(wantsCollision, propType) {
    if (propType?.collisionType === 'none') return false;
    if (wantsCollision === false) return false;
    if (propType?.collision === false) return false;
    return true;
}
