import { ALL_ABILITY_KEYS } from './initialAbilities.js';
import {
    ABILITY_SLOT_COUNT,
    STARTER_ABILITY_BAR_LAYOUT,
    normalizeAbilityBarLayout,
    equipAbilityToFirstFreeSlot,
    unequipAbilityFromBar,
    isAbilityEquipped,
    countEquippedAbilities,
    syncAbilityBarWithUnlocks,
    getAbilityKeyForUnlockNode,
    UNLOCK_NODE_TO_ABILITY,
} from './abilityLoadout.js';

export {
    ABILITY_SLOT_COUNT,
    ALL_ABILITY_KEYS,
    STARTER_ABILITY_BAR_LAYOUT,
    normalizeAbilityBarLayout,
    equipAbilityToFirstFreeSlot,
    unequipAbilityFromBar,
    isAbilityEquipped,
    countEquippedAbilities,
    syncAbilityBarWithUnlocks,
    getAbilityKeyForUnlockNode,
    UNLOCK_NODE_TO_ABILITY,
};

/** @deprecated use STARTER_ABILITY_BAR_LAYOUT */
export const DEFAULT_ABILITY_BAR_LAYOUT = STARTER_ABILITY_BAR_LAYOUT;

/** @deprecated use ALL_ABILITY_KEYS */
export const ABILITY_KEYS = ALL_ABILITY_KEYS;

/**
 * Unlocked abilities not on the 6-slot bar.
 * @param {string[] | null | undefined} layout
 * @param {Record<string, boolean> | null | undefined} skillUnlocks
 */
export function getUnassignedUnlockedAbilities(layout, skillUnlocks) {
    const normalized = normalizeAbilityBarLayout(layout, skillUnlocks);
    const onBar = new Set(normalized.filter(Boolean));
    return ALL_ABILITY_KEYS.filter((key) => skillUnlocks?.[key] && !onBar.has(key));
}
