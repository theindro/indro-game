// game/itemConstants.js
export const ItemTypes = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    HELMET: 'helmet',
    BOOTS: 'boots',
    GLOVES: 'gloves',
    RING: 'ring',
    AMULET: 'amulet',
    BOW: 'bow',
    CONSUMABLE: 'consumable',
    CRAFTING: 'crafting',
};

export const ItemRarity = {
    COMMON: {
        name: 'Common',
        color: '#9aa0a6',
        multiplier: 1,
        dropChance: 60,
    },
    MAGIC: {
        name: 'Magic',
        color: '#2ecc71',
        multiplier: 1.5,
        dropChance: 25,
    },
    RARE: {
        name: 'Rare',
        color: '#3498db',
        multiplier: 2,
        dropChance: 10,
    },
    EPIC: {
        name: 'Epic',
        color: '#9b59b6',
        multiplier: 3,
        dropChance: 4,
    },
    LEGENDARY: {
        name: 'Legendary',
        color: '#f39c12',
        multiplier: 5,
        dropChance: 1,
    },
};
