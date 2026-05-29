import { ALL_ABILITY_KEYS } from './initialAbilities.js';

export const ABILITY_SLOT_COUNT = 6;

/** First hotkey slot for new characters (Arrow Barrage). */
export const STARTER_ABILITY_BAR_LAYOUT = Object.freeze([
    'ability1',
    null,
    null,
    null,
    null,
    null,
]);

/** Skill node id → ability key (unlock nodes only). */
export const UNLOCK_NODE_TO_ABILITY = Object.freeze({
    unlock_barrage: 'ability1',
    unlock_rapid: 'ability2',
    unlock_empower: 'ability3',
    unlock_frost: 'ability4',
    unlock_venom: 'ability5',
    unlock_spin: 'ability6',
    unlock_void_leap: 'ability7',
});

/** @param {string} nodeId */
export function getAbilityKeyForUnlockNode(nodeId) {
    return UNLOCK_NODE_TO_ABILITY[nodeId] ?? null;
}

/**
 * @param {string[] | null | undefined} layout
 * @param {Record<string, boolean> | null | undefined} [skillUnlocks]
 */
export function normalizeAbilityBarLayout(layout, skillUnlocks) {
    const fallback = [...STARTER_ABILITY_BAR_LAYOUT];

    if (!Array.isArray(layout) || layout.length !== ABILITY_SLOT_COUNT) {
        return pruneLayout(fallback, skillUnlocks);
    }

    const used = new Set();
    const out = [];

    for (let i = 0; i < ABILITY_SLOT_COUNT; i++) {
        let key = layout[i];
        if (key == null || key === '') {
            out.push(null);
            continue;
        }
        if (!ALL_ABILITY_KEYS.includes(key) || used.has(key)) {
            out.push(null);
            continue;
        }
        if (skillUnlocks && !skillUnlocks[key]) {
            out.push(null);
            continue;
        }
        used.add(key);
        out.push(key);
    }

    return out;
}

/**
 * @param {string[]} layout
 * @param {Record<string, boolean> | null | undefined} [skillUnlocks]
 */
function pruneLayout(layout, skillUnlocks) {
    return layout.map((key) =>
        key && ALL_ABILITY_KEYS.includes(key) && (!skillUnlocks || skillUnlocks[key]) ? key : null
    );
}

/**
 * @param {string[]} layout
 * @param {string} abilityKey
 * @returns {string[]}
 */
export function equipAbilityToFirstFreeSlot(layout, abilityKey) {
    const next = [...layout];
    if (next.includes(abilityKey)) return next;
    const idx = next.findIndex((k) => k == null);
    if (idx === -1) return next;
    next[idx] = abilityKey;
    return next;
}

/**
 * @param {string[]} layout
 * @param {string} abilityKey
 * @returns {string[]}
 */
export function unequipAbilityFromBar(layout, abilityKey) {
    return layout.map((k) => (k === abilityKey ? null : k));
}

/**
 * @param {string[]} layout
 * @param {string} abilityKey
 */
export function isAbilityEquipped(layout, abilityKey) {
    return layout.includes(abilityKey);
}

export function countEquippedAbilities(layout) {
    return layout.filter(Boolean).length;
}

/**
 * After unlock state changes: drop invalid entries, auto-equip newly unlocked.
 * @param {string[] | null | undefined} layout
 * @param {Record<string, boolean> | null | undefined} prevUnlocks
 * @param {Record<string, boolean> | null | undefined} nextUnlocks
 */
export function syncAbilityBarWithUnlocks(layout, prevUnlocks, nextUnlocks) {
    let next = normalizeAbilityBarLayout(layout, nextUnlocks);

    for (const key of ALL_ABILITY_KEYS) {
        const was = !!prevUnlocks?.[key];
        const now = !!nextUnlocks?.[key];
        if (!now) {
            next = unequipAbilityFromBar(next, key);
        } else if (!was && now) {
            next = equipAbilityToFirstFreeSlot(next, key);
        }
    }

    return next;
}
