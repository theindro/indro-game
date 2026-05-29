/**
 * Prop collision for world movement (see collision.js).
 *
 * collisionType:
 * - `footprint` — tight outline from texture alpha (cached), polygon collision
 * - `auto` — footprint for rocks/stones; otherwise sprite AABB (×0.85)
 * - `rect` — fixed box at foot (bottom-center)
 * - `none` — no collider
 */

import {
    getPropFootprintShape,
    scaleFootprintShape,
    getFootprintBounds,
} from './propFootprint.js';

const DEFAULT_RECT_SIZE = 50;

const FOOTPRINT_TYPE_KEYS = new Set(['STONE', 'SNOW_STONE', 'LAVA_STONE']);

/** @type {Set<string>} */
const footprintWarned = new Set();

/**
 * @param {object | null | undefined} propType
 */
function wantsFootprintCollision(propType, collisionType) {
    if (collisionType === 'footprint') return true;
    if (collisionType !== 'auto') return false;
    if (propType?.footprintCollision === true) return true;
    if (propType?.typeKey && FOOTPRINT_TYPE_KEYS.has(propType.typeKey)) return true;
    return false;
}

/**
 * @param {number} footX
 * @param {number} footZ
 * @param {import('pixi.js').Sprite | import('pixi.js').Graphics} propVisual
 * @param {object | null | undefined} propType
 */
function buildFootprintCollider(footX, footZ, propVisual, propType, assetId) {
    const texture = propVisual?.texture;
    if (!texture) return null;

    const anchor = propVisual.anchor ?? { x: 0.5, y: 1 };
    const baseShape = getPropFootprintShape(texture, anchor.x, anchor.y, assetId);
    if (!baseShape || baseShape.length < 6) {
        if (
            import.meta.env.DEV &&
            wantsFootprintCollision(propType, propType?.collisionType ?? 'auto')
        ) {
            const key = assetId ?? propType?.typeKey ?? 'prop';
            if (!footprintWarned.has(key)) {
                footprintWarned.add(key);
                console.warn(
                    `[propCollider] No footprint for ${key} — using box collider. Re-enter the area after assets load.`
                );
            }
        }
        return null;
    }

    const scale = Math.max(
        Math.abs(propVisual.scale?.x ?? 1),
        Math.abs(propVisual.scale?.y ?? 1)
    );
    const shape = scaleFootprintShape(baseShape, scale);
    const bounds = getFootprintBounds(shape);

    return {
        x: footX,
        y: footZ,
        z: footZ,
        shape,
        isPropPolygon: true,
        rotation: 0,
        width: Math.max(12, bounds.width),
        height: Math.max(12, bounds.height),
    };
}

/**
 * @param {number} footX Prop foot world X (sprite anchor 0.5, 1).
 * @param {number} footZ Prop foot world Y / Z.
 * @param {import('pixi.js').Sprite | import('pixi.js').Graphics} propVisual
 * @param {object | null | undefined} propType Entry from PROP_TYPES
 * @returns {object | null}
 */
export function computePropColliderBounds(footX, footZ, propVisual, propType, assetId) {
    const collisionType = propType?.collisionType ?? 'auto';

    if (collisionType === 'none') {
        return null;
    }

    if (wantsFootprintCollision(propType, collisionType)) {
        const footprint = buildFootprintCollider(footX, footZ, propVisual, propType, assetId);
        if (footprint) return footprint;
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
