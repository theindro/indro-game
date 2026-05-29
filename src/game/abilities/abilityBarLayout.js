import { INITIAL_ABILITIES } from '../../stores/gameStore.js';

export const ABILITY_KEYS = Object.freeze(
    /** @type {const} */ (['ability1', 'ability2', 'ability3', 'ability4', 'ability5', 'ability6'])
);

export const DEFAULT_ABILITY_BAR_LAYOUT = Object.freeze([...ABILITY_KEYS]);

/**
 * @param {unknown} layout
 * @returns {typeof DEFAULT_ABILITY_BAR_LAYOUT}
 */
export function normalizeAbilityBarLayout(layout) {
    if (!Array.isArray(layout) || layout.length !== ABILITY_KEYS.length) {
        return [...DEFAULT_ABILITY_BAR_LAYOUT];
    }
    const valid = layout.every((k) => ABILITY_KEYS.includes(k));
    const unique = new Set(layout).size === ABILITY_KEYS.length;
    if (!valid || !unique) {
        return [...DEFAULT_ABILITY_BAR_LAYOUT];
    }
    return [...layout];
}
