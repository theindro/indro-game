// game/items.js
import { ItemTypes, ItemRarity } from './itemConstants.js';
import {
    EquippableGearItems,
    GearCraftingRecipes,
    rollMobGearDropIds,
    rollBossGearDropIds,
} from './equippableGear.js';

export { ItemTypes, ItemRarity } from './itemConstants.js';
export {
    GearCraftingRecipes,
    MOB_GEAR_DROP_RATES,
    MOB_MATERIAL_DROP_RATES,
    rollMobGearDropIds,
    rollBossGearDropIds,
} from './equippableGear.js';

/** Craft void materials from wallet void essence. */
export const MaterialCraftingRecipes = [
    {
        id: 'craft_void_soulstone',
        result: 'void_soulstone',
        goldCost: 0,
        ingredients: [{ id: 'void_essence', quantity: 100 }],
        category: 'material',
        tier: 'epic',
    },
    {
        id: 'craft_wrath_of_the_void',
        result: 'wrath_of_the_void',
        goldCost: 0,
        ingredients: [{ id: 'void_essence', quantity: 1000 }],
        category: 'material',
        tier: 'legendary',
    },
];

// Complete Item Database
export const ItemDatabase = {
    // ============= CRAFTING PROPS =============

    'chest_wood': {
        id: 'chest_wood',
        name: 'Wooden Chest',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'ðŸ“¦',
        texture: '/rpg/props/chest_wood.png',
        textureId: 'chest_wood',
        stackable: false,
        description: 'A simple wooden chest. Might contain loot.',
    },

    'chest_iron': {
        id: 'chest_iron',
        name: 'Iron Chest',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'ðŸ§°',
        texture: '/rpg/props/chest_iron.png',
        textureId: 'chest_iron',
        stackable: false,
        description: 'Reinforced chest with better loot.',
    },

    'chest_gold': {
        id: 'chest_gold',
        name: 'Golden Chest',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.RARE,
        icon: 'ðŸŸ¡',
        texture: '/rpg/props/chest_gold.png',
        textureId: 'chest_gold',
        stackable: false,
        description: 'Rare chest with valuable loot.',
    },

    'chest_ancient': {
        id: 'chest_ancient',
        name: 'Ancient Chest',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.EPIC,
        icon: 'ðŸª¦',
        texture: '/rpg/props/chest_ancient.png',
        textureId: 'chest_ancient',
        stackable: false,
        description: 'Ancient chest containing forgotten treasures.',
    },

    // ============= RESOURCES =============
    'wood_plank': {
        id: 'wood_plank',
        name: 'Wood',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'ðŸªµ',
        texture: '/rpg/resources/22.png',
        textureId: 'wood_plank',
        stackable: true,
        gatherable: true,
        description: 'Crafting resource.',
    },

    'iron_ingot': {
        id: 'iron_ingot',
        name: 'Nature Crystal',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.MAGIC,
        icon: 'â›ï¸',
        texture: '/rpg/resources/ore_iron.png',
        textureId: 'iron_ingot',
        stackable: true,
        gatherable: true,
        description: 'Crafting resource.',
    },

    'gold_ingot': {
        id: 'gold_ingot',
        name: 'Gold Crystal',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.MAGIC,
        icon: 'ðŸŸ¡',
        texture: '/rpg/resources/ore_gold.png',
        textureId: 'gold_ingot',
        stackable: true,
        gatherable: true,
        description: 'Crafting resource.',
    },

    'crystal_shard': {
        id: 'crystal_shard',
        name: 'Crystal Shard',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.MAGIC,
        icon: 'ðŸ’Ž',
        texture: '/rpg/resources/ore_crystal.png',
        textureId: 'crystal_shard',
        stackable: true,
        gatherable: true,
        description: 'Magical crystal ore.',
    },

    'lava_stone': {
        id: 'lava_stone',
        name: 'Lava Crystal',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.MAGIC,
        icon: 'ðŸ”¥',
        texture: '/rpg/resources/ore_lava.png',
        textureId: 'lava_stone',
        stackable: true,
        gatherable: true,
        description: 'Volcanic ore infused with heat.',
    },

    void_soulstone: {
        id: 'void_soulstone',
        name: 'Void Soulstone',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.EPIC,
        icon: '💜',
        texture: '/void_essence.png',
        textureId: 'void_essence',
        stackable: true,
        description: 'Condensed void energy. Required to craft epic (purple) gear.',
    },

    wrath_of_the_void: {
        id: 'wrath_of_the_void',
        name: 'Wrath of the Void',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.LEGENDARY,
        icon: '💜',
        texture: '/void_essence.png',
        textureId: 'void_essence',
        stackable: true,
        description: 'Pure void wrath. Required to craft legendary gear.',
    },

    // ============= HERBS =============

    'herb': {
        id: 'herb',
        name: 'Green Herb',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'ðŸŒ¿',
        texture: '/rpg/resources/hemp.png',
        textureId: 'herb',
        stackable: true,
        gatherable: true,
        description: 'Basic healing herb.',
    },

    'frostbloom': {
        id: 'frostbloom',
        name: 'Ice Herb',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'â„ï¸',
        texture: '/rpg/resources/silkweed.png',
        textureId: 'frostbloom',
        stackable: true,
        gatherable: true,
        description: 'Cold herb used in potions.',
    },

// ============= CONTAINERS =============

    'barrel': {
        id: 'barrel',
        name: 'Barrel',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'ðŸ›¢ï¸',
        texture: '/rpg/props/barrel.png',
        textureId: 'barrel',
        stackable: false,
        description: 'Can contain random loot.',
    },

    'crate': {
        id: 'crate',
        name: 'Crate',
        type: ItemTypes.CRAFTING,
        rarity: ItemRarity.COMMON,
        icon: 'ðŸ“¦',
        texture: '/rpg/props/crate.png',
        textureId: 'crate',
        stackable: false,
        description: 'Wooden supply crate.',
    },

};

Object.assign(ItemDatabase, EquippableGearItems);

// ============= DROP TABLES =============
export const DropTables = {
    gold: { min: 1, max: 4, chance: 70 },
    void_essence: { min: 1, max: 2, chance: 35 },

    forest_mob: {
        gold: { min: 1, max: 5, chance: 72 },
        void_essence: { min: 1, max: 2, chance: 28 },
        items: [],
    },
    desert_mob: {
        gold: { min: 2, max: 7, chance: 78 },
        void_essence: { min: 1, max: 2, chance: 32 },
        items: [],
    },
    ice_mob: {
        gold: { min: 2, max: 9, chance: 82 },
        void_essence: { min: 1, max: 3, chance: 38 },
        items: [],
    },
    lava_mob: {
        gold: { min: 3, max: 11, chance: 85 },
        void_essence: { min: 1, max: 3, chance: 42 },
        items: [],
    },
    elite: {
        gold: { min: 8, max: 22, chance: 100 },
        void_essence: { min: 1, max: 3, chance: 55 },
        items: [],
    },
    boss: {
        gold: { min: 40, max: 120, chance: 100 },
        void_essence: { min: 8, max: 18, chance: 100 },
        items: [],
    },
    chest: {
        gold: { min: 8, max: 35, chance: 88 },
        items: [],
    },
};

export function getRandomItemFromDropTable(dropTable) {
    if (!dropTable?.items?.length) return null;
    const roll = Math.random() * 100;
    let cumulativeChance = 0;
    for (const item of dropTable.items) {
        cumulativeChance += item.chance;
        if (roll <= cumulativeChance) {
            const quantity = Math.floor(Math.random() * (item.maxQty - item.minQty + 1)) + item.minQty;
            const baseItem = ItemDatabase[item.id];
            if (!baseItem) return null;
            return { ...baseItem, quantity };
        }
    }
    return null;
}

export function getRandomGoldFromDropTable(dropTable) {
    if (!dropTable?.gold) return 0;
    const roll = Math.random() * 100;
    if (roll <= dropTable.gold.chance) {
        return Math.floor(Math.random() * (dropTable.gold.max - dropTable.gold.min + 1)) + dropTable.gold.min;
    }
    return 0;
}

export function getDropTableForMob(mobType, biome) {
    if (mobType === 'boss') return DropTables.boss;
    if (mobType === 'elite') return DropTables.elite;
    switch (biome) {
        case 'desert': return DropTables.desert_mob;
        case 'ice': return DropTables.ice_mob;
        case 'lava': return DropTables.lava_mob;
        default: return DropTables.forest_mob;
    }
}
