import { ItemDatabase } from './items.js';

/** Void essence returned when dismantling gear by rarity (Magic = "uncommon" tier). */
export const DISMANTLE_ESSENCE_BY_RARITY = {
    Common: 2,
    Magic: 4,
    Rare: 8,
    Epic: 25,
    Legendary: 50,
};

const RARITY_SORT_ORDER = {
    Legendary: 0,
    Epic: 1,
    Rare: 2,
    Magic: 3,
    Common: 4,
};

export function canDismantleItem(itemId) {
    const db = ItemDatabase[itemId];
    return !!(db?.equipSlot);
}

export function getDismantleEssenceYield(itemId) {
    const db = ItemDatabase[itemId];
    if (!db?.equipSlot) return 0;
    return DISMANTLE_ESSENCE_BY_RARITY[db.rarity?.name] ?? 1;
}

export function compareInventorySlots(a, b) {
    const dbA = ItemDatabase[a.id];
    const dbB = ItemDatabase[b.id];
    const ra = RARITY_SORT_ORDER[dbA?.rarity?.name] ?? 99;
    const rb = RARITY_SORT_ORDER[dbB?.rarity?.name] ?? 99;
    if (ra !== rb) return ra - rb;
    const ta = dbA?.type ?? '';
    const tb = dbB?.type ?? '';
    if (ta !== tb) return ta.localeCompare(tb);
    return (dbA?.name ?? a.id).localeCompare(dbB?.name ?? b.id);
}
