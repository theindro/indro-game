/**
 * World Y-sort depth for props with bottom anchor (0.5, 1).
 * Higher zIndex draws on top (further south on the map).
 *
 * Do not subtract sprite height from z — small interactables were sorting
 * in front of tall trees at the same or lower Y.
 */

/**
 * @param {number} footY World Y at the sprite base (anchor foot).
 * @returns {number}
 */
export function computeFootSortZ(footY) {
    return footY;
}
