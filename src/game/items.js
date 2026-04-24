// game/items.js
export const ItemTypes = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    HELMET: 'helmet',
    BOOTS: 'boots',
    GLOVES: 'gloves',
    RING: 'ring',
    AMULET: 'amulet',
    CONSUMABLE: 'consumable',
};

export const ItemRarity = {
    COMMON: { name: 'Common', color: '#ffffff', multiplier: 1 },
    MAGIC: { name: 'Magic', color: '#44aaff', multiplier: 1.5 },
    RARE: { name: 'Rare', color: '#aa44ff', multiplier: 2 },
    EPIC: { name: 'Epic', color: '#ff44aa', multiplier: 3 },
    LEGENDARY: { name: 'Legendary', color: '#ffaa44', multiplier: 5 },
};

// Item database
export const ItemDatabase = {
    // Boots
    'leather_boots': {
        id: 'leather_boots',
        name: 'Leather Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.COMMON,
        icon: '👢',
        texture: '/rpg/armour/1.png',
        textureId: 'leather_boots',
        price: 50,
        equipSlot: "boots",
        description: 'Sturdy leather boots',
        stats: {
            moveSpeed: 0.2,
            armor: 5,
        }
    },
    'iron_boots': {
        id: 'iron_boots',
        name: 'Iron Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.MAGIC,
        icon: '👢',
        texture: '/assets/rpg/armour/iron_boots.png',
        price: 150,
        description: 'Heavy iron boots',
        stats: {
            moveSpeed: 0.05,
            armor: 15,
            health: 25,
        }
    },
    'swift_boots': {
        id: 'swift_boots',
        name: 'Swift Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.RARE,
        icon: '👢⚡',
        texture: '/assets/rpg/armour/swift_boots.png',
        price: 300,
        description: 'Boots of swiftness',
        stats: {
            moveSpeed: 0.3,
            armor: 8,
            dodge: 10,
        }
    },

    // Weapons
    'wooden_sword': {
        id: 'wooden_sword',
        name: 'Wooden Sword',
        type: ItemTypes.WEAPON,
        rarity: ItemRarity.COMMON,
        icon: '🗡️',
        texture: '/assets/rpg/weapons/wooden_sword.png',
        price: 100,
        description: 'A basic wooden sword',
        stats: {
            damage: 5,
            attackSpeed: 5,
        }
    },
    'iron_sword': {
        id: 'iron_sword',
        name: 'Iron Sword',
        type: ItemTypes.WEAPON,
        rarity: ItemRarity.MAGIC,
        icon: '⚔️',
        texture: '/assets/rpg/weapons/iron_sword.png',
        price: 300,
        description: 'Sharp iron blade',
        stats: {
            damage: 12,
            attackSpeed: 8,
            critChance: 5,
        }
    },

    // Armor
    'leather_armor': {
        id: 'leather_armor',
        name: 'Leather Armor',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.COMMON,
        icon: '🥋',
        texture: '/assets/rpg/armour/leather_armor.png',
        price: 150,
        description: 'Light leather protection',
        stats: {
            armor: 10,
            health: 25,
        }
    },

    // Helmets
    'leather_helmet': {
        id: 'leather_helmet',
        name: 'Leather Helmet',
        type: ItemTypes.HELMET,
        rarity: ItemRarity.COMMON,
        icon: '⛑️',
        texture: '/assets/rpg/armour/leather_helmet.png',
        price: 75,
        description: 'Basic head protection',
        stats: {
            armor: 5,
            health: 15,
        }
    },

    // Rings
    'ring_of_power': {
        id: 'ring_of_power',
        name: 'Ring of Power',
        type: ItemTypes.RING,
        rarity: ItemRarity.EPIC,
        icon: '💍',
        texture: '/assets/rpg/jewelry/ring_power.png',
        price: 500,
        description: 'A ring that enhances abilities',
        stats: {
            damage: 8,
            critChance: 10,
            critDamage: 25,
            projectiles: 1,
        }
    },

    // Amulets
    'amulet_of_swiftness': {
        id: 'amulet_of_swiftness',
        name: 'Amulet of Swiftness',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.RARE,
        icon: '📿',
        texture: '/assets/rpg/jewelry/amulet.png',
        price: 400,
        description: 'Increases attack speed',
        stats: {
            attackSpeed: 15,
            moveSpeed: 0.1,
        }
    },
};

// Drop Tables per mob type
export const DropTables = {
    // Default drops for all mobs
    default: {
        gold: { min: 1, max: 3, chance: 100 },
        items: [
            { id: 'leather_boots', chance: 100, minQty: 1, maxQty: 1 },
            { id: 'leather_armor', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'leather_helmet', chance: 4, minQty: 1, maxQty: 1 },
            { id: 'wooden_sword', chance: 2, minQty: 1, maxQty: 1 },
        ]
    },

    // Elite mob drops (better chances)
    elite: {
        gold: { min: 5, max: 15, chance: 100 },
        items: [
            { id: 'iron_boots', chance: 10, minQty: 1, maxQty: 1 },
            { id: 'iron_sword', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'ring_of_power', chance: 2, minQty: 1, maxQty: 1 },
        ]
    },

    // Boss drops
    boss: {
        gold: { min: 50, max: 150, chance: 100 },
        items: [
            { id: 'swift_boots', chance: 25, minQty: 1, maxQty: 1 },
            { id: 'iron_sword', chance: 30, minQty: 1, maxQty: 1 },
            { id: 'ring_of_power', chance: 20, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_swiftness', chance: 15, minQty: 1, maxQty: 1 },
        ]
    },
};