// game/items.js
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
};

export const ItemRarity = {
    COMMON: { name: 'Common', color: '#ffffff', multiplier: 1, dropChance: 60 },
    MAGIC: { name: 'Magic', color: '#44aaff', multiplier: 1.5, dropChance: 25 },
    RARE: { name: 'Rare', color: '#aa44ff', multiplier: 2, dropChance: 10 },
    EPIC: { name: 'Epic', color: '#ff44aa', multiplier: 3, dropChance: 4 },
    LEGENDARY: { name: 'Legendary', color: '#ffaa44', multiplier: 5, dropChance: 1 },
};

// Helper function to generate stat ranges based on rarity
function getStatValue(baseValue, rarity, isPercent = false) {
    let value = baseValue * rarity.multiplier;
    if (isPercent) {
        return Math.floor(value);
    }
    return Math.floor(value);
}

// Complete Item Database
export const ItemDatabase = {
    // ============= BOOTS (1-6) =============
    'leather_boots': {
        id: 'leather_boots',
        name: 'Leather Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.COMMON,
        icon: '👢',
        texture: '/rpg/armour/1.png',
        textureId: 'boots_1',
        price: 50,
        equipSlot: "boots",
        description: 'Sturdy leather boots',
        stats: {
            moveSpeed: 0.10,
            armor: 5,
        }
    },
    'iron_boots': {
        id: 'iron_boots',
        name: 'Iron Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.MAGIC,
        icon: '👢',
        texture: '/rpg/armour/2.png',
        textureId: 'boots_2',
        price: 150,
        equipSlot: "boots",
        description: 'Reinforced iron boots',
        stats: {
            moveSpeed: 0.15,
            armor: 12,
            health: 25,
        }
    },
    'steel_boots': {
        id: 'steel_boots',
        name: 'Steel Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.RARE,
        icon: '👢',
        texture: '/rpg/armour/3.png',
        textureId: 'boots_3',
        price: 350,
        equipSlot: "boots",
        description: 'Tempered steel boots',
        stats: {
            moveSpeed: 0.20,
            armor: 20,
            health: 50,
            strength: 5,
        }
    },
    'swift_boots': {
        id: 'swift_boots',
        name: 'Swift Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.EPIC,
        icon: '👢',
        texture: '/rpg/armour/4.png',
        textureId: 'boots_4',
        price: 800,
        equipSlot: "boots",
        description: 'Boots enchanted with speed',
        stats: {
            moveSpeed: 0.35,
            armor: 15,
            dexterity: 15,
            dodge: 8,
        }
    },
    'dragon_boots': {
        id: 'dragon_boots',
        name: 'Dragon Scale Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.LEGENDARY,
        icon: '👢',
        texture: '/rpg/armour/5.png',
        textureId: 'boots_5',
        price: 2000,
        equipSlot: "boots",
        description: 'Boots forged from dragon scales',
        stats: {
            moveSpeed: 0.50,
            armor: 35,
            health: 100,
            strength: 15,
            fireResist: 25,
        }
    },
    'shadow_boots': {
        id: 'shadow_boots',
        name: 'Shadow Walker Boots',
        type: ItemTypes.BOOTS,
        rarity: ItemRarity.EPIC,
        icon: '👢',
        texture: '/rpg/armour/6.png',
        textureId: 'boots_6',
        price: 900,
        equipSlot: "boots",
        description: 'Boots that blend with shadows',
        stats: {
            moveSpeed: 0.30,
            armor: 12,
            dexterity: 20,
            critChance: 5,
        }
    },

    // ============= GLOVES (16-24) =============
    'leather_gloves': {
        id: 'leather_gloves',
        name: 'Leather Gloves',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.COMMON,
        icon: '🧤',
        texture: '/rpg/armour/16.png',
        textureId: 'gloves_16',
        price: 40,
        equipSlot: "gloves",
        description: 'Simple leather gloves',
        stats: {
            armor: 3,
            attackSpeed: 2,
        }
    },
    'iron_gloves': {
        id: 'iron_gloves',
        name: 'Iron Gloves',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.MAGIC,
        icon: '🧤',
        texture: '/rpg/armour/17.png',
        textureId: 'gloves_17',
        price: 120,
        equipSlot: "gloves",
        description: 'Sturdy iron gloves',
        stats: {
            armor: 8,
            attackSpeed: 4,
            strength: 5,
        }
    },
    'steel_gloves': {
        id: 'steel_gloves',
        name: 'Steel Gauntlets',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.RARE,
        icon: '🧤',
        texture: '/rpg/armour/18.png',
        textureId: 'gloves_18',
        price: 300,
        equipSlot: "gloves",
        description: 'Heavy steel gauntlets',
        stats: {
            armor: 15,
            attackSpeed: 6,
            strength: 12,
            critDamage: 10,
        }
    },
    'gold_gloves': {
        id: 'gold_gloves',
        name: 'Golden Gauntlets',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.RARE,
        icon: '🧤',
        texture: '/rpg/armour/19.png',
        textureId: 'gloves_19',
        price: 400,
        equipSlot: "gloves",
        description: 'Gloves plated with gold',
        stats: {
            armor: 10,
            attackSpeed: 8,
            goldFind: 15,
            strength: 8,
        }
    },
    'spell_gloves': {
        id: 'spell_gloves',
        name: 'Spellweaver Gloves',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.EPIC,
        icon: '🧤',
        texture: '/rpg/armour/20.png',
        textureId: 'gloves_20',
        price: 750,
        equipSlot: "gloves",
        description: 'Gloves imbued with arcane energy',
        stats: {
            armor: 8,
            intelligence: 20,
            manaRegen: 5,
            spellPower: 15,
        }
    },
    'dragon_gloves': {
        id: 'dragon_gloves',
        name: 'Dragonclaw Gauntlets',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.LEGENDARY,
        icon: '🧤',
        texture: '/rpg/armour/21.png',
        textureId: 'gloves_21',
        price: 1800,
        equipSlot: "gloves",
        description: 'Gauntlets made from dragon claws',
        stats: {
            armor: 25,
            attackSpeed: 15,
            strength: 20,
            critChance: 10,
            critDamage: 25,
        }
    },
    'assassin_gloves': {
        id: 'assassin_gloves',
        name: 'Assassin Grips',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.EPIC,
        icon: '🧤',
        texture: '/rpg/armour/22.png',
        textureId: 'gloves_22',
        price: 850,
        equipSlot: "gloves",
        description: 'Gloves designed for stealth',
        stats: {
            armor: 6,
            attackSpeed: 12,
            dexterity: 18,
            critChance: 8,
        }
    },
    'holy_gloves': {
        id: 'holy_gloves',
        name: 'Holy Gauntlets',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.EPIC,
        icon: '🧤',
        texture: '/rpg/armour/23.png',
        textureId: 'gloves_23',
        price: 800,
        equipSlot: "gloves",
        description: 'Blessed gauntlets',
        stats: {
            armor: 12,
            health: 75,
            strength: 10,
            holyResist: 20,
        }
    },
    'frost_gloves': {
        id: 'frost_gloves',
        name: 'Frostbite Gloves',
        type: ItemTypes.GLOVES,
        rarity: ItemRarity.RARE,
        icon: '🧤',
        texture: '/rpg/armour/24.png',
        textureId: 'gloves_24',
        price: 350,
        equipSlot: "gloves",
        description: 'Gloves that channel ice',
        stats: {
            armor: 8,
            attackSpeed: 5,
            iceDamage: 15,
            freezeChance: 5,
        }
    },

    // ============= CHEST ARMOR (30-35) =============
    'leather_armor': {
        id: 'leather_armor',
        name: 'Leather Armor',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.COMMON,
        icon: '🛡️',
        texture: '/rpg/armour/30.png',
        textureId: 'chest_30',
        price: 80,
        equipSlot: "chest",
        description: 'Tanned leather chestpiece',
        stats: {
            armor: 10,
            health: 30,
        }
    },
    'iron_armor': {
        id: 'iron_armor',
        name: 'Iron Chestplate',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.MAGIC,
        icon: '🛡️',
        texture: '/rpg/armour/31.png',
        textureId: 'chest_31',
        price: 200,
        equipSlot: "chest",
        description: 'Sturdy iron chestplate',
        stats: {
            armor: 25,
            health: 60,
            strength: 8,
        }
    },
    'steel_armor': {
        id: 'steel_armor',
        name: 'Steel Breastplate',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.RARE,
        icon: '🛡️',
        texture: '/rpg/armour/32.png',
        textureId: 'chest_32',
        price: 450,
        equipSlot: "chest",
        description: 'Tempered steel breastplate',
        stats: {
            armor: 40,
            health: 100,
            strength: 15,
        }
    },
    'gold_armor': {
        id: 'gold_armor',
        name: 'Golden Chestplate',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.RARE,
        icon: '🛡️',
        texture: '/rpg/armour/33.png',
        textureId: 'chest_33',
        price: 600,
        equipSlot: "chest",
        description: 'Ornate golden chestplate',
        stats: {
            armor: 30,
            health: 80,
            goldFind: 20,
            charm: 10,
        }
    },
    'dragon_armor': {
        id: 'dragon_armor',
        name: 'Dragon Scale Armor',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.LEGENDARY,
        icon: '🛡️',
        texture: '/rpg/armour/34.png',
        textureId: 'chest_34',
        price: 2500,
        equipSlot: "chest",
        description: 'Armor made from dragon scales',
        stats: {
            armor: 65,
            health: 200,
            strength: 25,
            fireResist: 30,
            allResist: 15,
        }
    },
    'shadow_armor': {
        id: 'shadow_armor',
        name: 'Shadow Cloak',
        type: ItemTypes.ARMOR,
        rarity: ItemRarity.EPIC,
        icon: '🛡️',
        texture: '/rpg/armour/35.png',
        textureId: 'chest_35',
        price: 1000,
        equipSlot: "chest",
        description: 'Cloak woven from shadows',
        stats: {
            armor: 20,
            health: 60,
            dexterity: 25,
            dodge: 15,
            critChance: 8,
        }
    },

    // ============= HELMETS (48-52) =============
    'leather_helmet': {
        id: 'leather_helmet',
        name: 'Leather Helmet',
        type: ItemTypes.HELMET,
        rarity: ItemRarity.COMMON,
        icon: '⛑️',
        texture: '/rpg/armour/48.png',
        textureId: 'helmet_48',
        price: 45,
        equipSlot: "helmet",
        description: 'Simple leather cap',
        stats: {
            armor: 4,
            health: 15,
        }
    },
    'iron_helmet': {
        id: 'iron_helmet',
        name: 'Iron Helmet',
        type: ItemTypes.HELMET,
        rarity: ItemRarity.MAGIC,
        icon: '⛑️',
        texture: '/rpg/armour/49.png',
        textureId: 'helmet_49',
        price: 130,
        equipSlot: "helmet",
        description: 'Sturdy iron helmet',
        stats: {
            armor: 12,
            health: 35,
            strength: 5,
        }
    },
    'steel_helmet': {
        id: 'steel_helmet',
        name: 'Steel Helm',
        type: ItemTypes.HELMET,
        rarity: ItemRarity.RARE,
        icon: '⛑️',
        texture: '/rpg/armour/50.png',
        textureId: 'helmet_50',
        price: 320,
        equipSlot: "helmet",
        description: 'Tempered steel helm',
        stats: {
            armor: 22,
            health: 60,
            strength: 10,
            critChance: 3,
        }
    },
    'crown': {
        id: 'crown',
        name: 'Crown of Kings',
        type: ItemTypes.HELMET,
        rarity: ItemRarity.EPIC,
        icon: '👑',
        texture: '/rpg/armour/51.png',
        textureId: 'helmet_51',
        price: 900,
        equipSlot: "helmet",
        description: 'Royal crown of ancient kings',
        stats: {
            armor: 15,
            health: 80,
            allStats: 10,
            goldFind: 25,
            charm: 15,
        }
    },
    'dragon_helmet': {
        id: 'dragon_helmet',
        name: 'Dragon Helm',
        type: ItemTypes.HELMET,
        rarity: ItemRarity.LEGENDARY,
        icon: '⛑️',
        texture: '/rpg/armour/52.png',
        textureId: 'helmet_52',
        price: 2200,
        equipSlot: "helmet",
        description: 'Helmet forged in dragon fire',
        stats: {
            armor: 40,
            health: 150,
            strength: 18,
            fireResist: 25,
            allResist: 10,
        }
    },

    // ============= BOWS (86-89) =============
    'short_bow': {
        id: 'short_bow',
        name: 'Short Bow',
        type: ItemTypes.BOW,
        rarity: ItemRarity.COMMON,
        icon: '🏹',
        texture: '/rpg/armour/86.png',
        textureId: 'bow_86',
        price: 100,
        equipSlot: "weapon",
        description: 'Simple short bow',
        stats: {
            damage: 15,
            attackSpeed: 10,
            range: 50,
        }
    },
    'long_bow': {
        id: 'long_bow',
        name: 'Long Bow',
        type: ItemTypes.BOW,
        rarity: ItemRarity.MAGIC,
        icon: '🏹',
        texture: '/rpg/armour/87.png',
        textureId: 'bow_87',
        price: 250,
        equipSlot: "weapon",
        description: 'Powerful long bow',
        stats: {
            damage: 25,
            attackSpeed: 8,
            range: 70,
            dexterity: 8,
        }
    },
    'crossbow': {
        id: 'crossbow',
        name: 'Heavy Crossbow',
        type: ItemTypes.BOW,
        rarity: ItemRarity.RARE,
        icon: '🏹',
        texture: '/rpg/armour/88.png',
        textureId: 'bow_88',
        price: 500,
        equipSlot: "weapon",
        description: 'Powerful crossbow',
        stats: {
            damage: 40,
            attackSpeed: 5,
            range: 80,
            strength: 10,
            critDamage: 20,
        }
    },
    'windbow': {
        id: 'windbow',
        name: 'Windrunner Bow',
        type: ItemTypes.BOW,
        rarity: ItemRarity.EPIC,
        icon: '🏹',
        texture: '/rpg/armour/89.png',
        textureId: 'bow_89',
        price: 1200,
        equipSlot: "weapon",
        description: 'Bow blessed by wind spirits',
        stats: {
            damage: 35,
            attackSpeed: 20,
            range: 90,
            dexterity: 20,
            critChance: 12,
            pierce: 25,
        }
    },

    // ============= RINGS (90-100) =============
    'ring_of_strength': {
        id: 'ring_of_strength',
        name: 'Ring of Strength',
        type: ItemTypes.RING,
        rarity: ItemRarity.MAGIC,
        icon: '💍',
        texture: '/rpg/armour/90.png',
        textureId: 'ring_90',
        price: 150,
        equipSlot: "ring",
        description: 'Increases physical power',
        stats: {
            strength: 8,
            damage: 5,
        }
    },
    'ring_of_dexterity': {
        id: 'ring_of_dexterity',
        name: 'Ring of Dexterity',
        type: ItemTypes.RING,
        rarity: ItemRarity.MAGIC,
        icon: '💍',
        texture: '/rpg/armour/91.png',
        textureId: 'ring_91',
        price: 150,
        equipSlot: "ring",
        description: 'Enhances agility',
        stats: {
            dexterity: 8,
            attackSpeed: 5,
            critChance: 3,
        }
    },
    'ring_of_intellect': {
        id: 'ring_of_intellect',
        name: 'Ring of Intellect',
        type: ItemTypes.RING,
        rarity: ItemRarity.MAGIC,
        icon: '💍',
        texture: '/rpg/armour/92.png',
        textureId: 'ring_92',
        price: 150,
        equipSlot: "ring",
        description: 'Sharpens the mind',
        stats: {
            intelligence: 8,
            manaRegen: 3,
            spellPower: 5,
        }
    },
    'ring_of_health': {
        id: 'ring_of_health',
        name: 'Ring of Vitality',
        type: ItemTypes.RING,
        rarity: ItemRarity.RARE,
        icon: '💍',
        texture: '/rpg/armour/93.png',
        textureId: 'ring_93',
        price: 300,
        equipSlot: "ring",
        description: 'Blessed with life energy',
        stats: {
            health: 60,
            healthRegen: 3,
            armor: 8,
        }
    },
    'ring_of_speed': {
        id: 'ring_of_speed',
        name: 'Ring of Alacrity',
        type: ItemTypes.RING,
        rarity: ItemRarity.RARE,
        icon: '💍',
        texture: '/rpg/armour/94.png',
        textureId: 'ring_94',
        price: 350,
        equipSlot: "ring",
        description: 'Grants swiftness',
        stats: {
            moveSpeed: 0.15,
            attackSpeed: 10,
            dexterity: 12,
        }
    },
    'ring_of_crit': {
        id: 'ring_of_crit',
        name: 'Ring of Precision',
        type: ItemTypes.RING,
        rarity: ItemRarity.RARE,
        icon: '💍',
        texture: '/rpg/armour/95.png',
        textureId: 'ring_95',
        price: 400,
        equipSlot: "ring",
        description: 'Find the weak spots',
        stats: {
            critChance: 8,
            critDamage: 20,
            dexterity: 10,
        }
    },
    'ring_of_magic': {
        id: 'ring_of_magic',
        name: 'Ring of Sorcery',
        type: ItemTypes.RING,
        rarity: ItemRarity.EPIC,
        icon: '💍',
        texture: '/rpg/armour/96.png',
        textureId: 'ring_96',
        price: 700,
        equipSlot: "ring",
        description: 'Channel arcane power',
        stats: {
            intelligence: 20,
            manaRegen: 8,
            spellPower: 15,
            mana: 50,
        }
    },
    'ring_of_protection': {
        id: 'ring_of_protection',
        name: 'Ring of Warding',
        type: ItemTypes.RING,
        rarity: ItemRarity.EPIC,
        icon: '💍',
        texture: '/rpg/armour/97.png',
        textureId: 'ring_97',
        price: 750,
        equipSlot: "ring",
        description: 'Magical protection',
        stats: {
            armor: 15,
            health: 80,
            allResist: 12,
            dodge: 5,
        }
    },
    'ring_of_fire': {
        id: 'ring_of_fire',
        name: 'Ring of Inferno',
        type: ItemTypes.RING,
        rarity: ItemRarity.EPIC,
        icon: '💍',
        texture: '/rpg/armour/98.png',
        textureId: 'ring_98',
        price: 800,
        equipSlot: "ring",
        description: 'Harness fire magic',
        stats: {
            fireDamage: 25,
            strength: 15,
            intelligence: 15,
            fireResist: 20,
        }
    },
    'ring_of_life': {
        id: 'ring_of_life',
        name: 'Ring of Eternal Life',
        type: ItemTypes.RING,
        rarity: ItemRarity.LEGENDARY,
        icon: '💍',
        texture: '/rpg/armour/99.png',
        textureId: 'ring_99',
        price: 2000,
        equipSlot: "ring",
        description: 'Ancient ring of immortality',
        stats: {
            health: 200,
            healthRegen: 10,
            allStats: 15,
            lifeSteal: 5,
        }
    },
    'ring_of_power': {
        id: 'ring_of_power',
        name: 'Ring of Pure Power',
        type: ItemTypes.RING,
        rarity: ItemRarity.LEGENDARY,
        icon: '💍',
        texture: '/rpg/armour/100.png',
        textureId: 'ring_100',
        price: 2500,
        equipSlot: "ring",
        description: 'Overwhelming strength',
        stats: {
            strength: 30,
            damage: 25,
            critDamage: 30,
            attackSpeed: 12,
        }
    },

    // ============= AMULETS (107-114) =============
    'amulet_of_health': {
        id: 'amulet_of_health',
        name: 'Amulet of Life',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.MAGIC,
        icon: '📿',
        texture: '/rpg/armour/107.png',
        textureId: 'amulet_107',
        price: 180,
        equipSlot: "amulet",
        description: 'Blessed amulet',
        stats: {
            health: 50,
            healthRegen: 2,
        }
    },
    'amulet_of_strength': {
        id: 'amulet_of_strength',
        name: 'Amulet of Might',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.MAGIC,
        icon: '📿',
        texture: '/rpg/armour/108.png',
        textureId: 'amulet_108',
        price: 180,
        equipSlot: "amulet",
        description: 'Channel raw power',
        stats: {
            strength: 10,
            damage: 8,
        }
    },
    'amulet_of_magic': {
        id: 'amulet_of_magic',
        name: 'Amulet of Wisdom',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.RARE,
        icon: '📿',
        texture: '/rpg/armour/109.png',
        textureId: 'amulet_109',
        price: 400,
        equipSlot: "amulet",
        description: 'Arcane knowledge',
        stats: {
            intelligence: 15,
            manaRegen: 5,
            spellPower: 10,
        }
    },
    'amulet_of_protection': {
        id: 'amulet_of_protection',
        name: 'Amulet of Warding',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.RARE,
        icon: '📿',
        texture: '/rpg/armour/110.png',
        textureId: 'amulet_110',
        price: 450,
        equipSlot: "amulet",
        description: 'Defensive charm',
        stats: {
            armor: 12,
            allResist: 10,
            dodge: 5,
        }
    },
    'amulet_of_speed': {
        id: 'amulet_of_speed',
        name: 'Amulet of Haste',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.EPIC,
        icon: '📿',
        texture: '/rpg/armour/111.png',
        textureId: 'amulet_111',
        price: 850,
        equipSlot: "amulet",
        description: 'Incredible swiftness',
        stats: {
            moveSpeed: 0.20,
            attackSpeed: 12,
            dexterity: 18,
        }
    },
    'amulet_of_crit': {
        id: 'amulet_of_crit',
        name: 'Amulet of Ruin',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.EPIC,
        icon: '📿',
        texture: '/rpg/armour/112.png',
        textureId: 'amulet_112',
        price: 900,
        equipSlot: "amulet",
        description: 'Devastating precision',
        stats: {
            critChance: 10,
            critDamage: 35,
            dexterity: 15,
        }
    },
    'amulet_of_swiftness': {
        id: 'amulet_of_swiftness',
        name: 'Amulet of Swiftness',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.LEGENDARY,
        icon: '📿',
        texture: '/rpg/armour/113.png',
        textureId: 'amulet_113',
        price: 2200,
        equipSlot: "amulet",
        description: 'Legendary speed',
        stats: {
            moveSpeed: 0.35,
            attackSpeed: 25,
            dexterity: 25,
            dodge: 15,
            critChance: 8,
        }
    },
    'amulet_of_gods': {
        id: 'amulet_of_gods',
        name: 'Amulet of the Gods',
        type: ItemTypes.AMULET,
        rarity: ItemRarity.LEGENDARY,
        icon: '📿',
        texture: '/rpg/armour/114.png',
        textureId: 'amulet_114',
        price: 3000,
        equipSlot: "amulet",
        description: 'Blessed by divine power',
        stats: {
            allStats: 20,
            health: 150,
            damage: 20,
            allResist: 20,
            goldFind: 30,
        }
    },
};

// ============= COMPLETE DROP TABLES =============
export const DropTables = {
    // Common forest mob drops
        gold: { min: 2, max: 8, chance: 85 },
    forest_mob: {
        gold: { min: 2, max: 8, chance: 85 },
        items: [
            { id: 'leather_boots', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'leather_gloves', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'leather_armor', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'leather_helmet', chance: 4, minQty: 1, maxQty: 1 },
            { id: 'short_bow', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'ring_of_strength', chance: 1, minQty: 1, maxQty: 1 },
            { id: 'ring_of_dexterity', chance: 1, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_health', chance: 1, minQty: 1, maxQty: 1 },
        ]
    },

    // Desert mob drops
    desert_mob: {
        gold: { min: 3, max: 12, chance: 90 },
        items: [
            { id: 'iron_boots', chance: 4, minQty: 1, maxQty: 1 },
            { id: 'iron_gloves', chance: 4, minQty: 1, maxQty: 1 },
            { id: 'iron_armor', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'iron_helmet', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'long_bow', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'ring_of_intellect', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_strength', chance: 2, minQty: 1, maxQty: 1 },
        ]
    },

    // Ice mob drops
    ice_mob: {
        gold: { min: 4, max: 15, chance: 95 },
        items: [
            { id: 'steel_boots', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'steel_gloves', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'steel_armor', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'steel_helmet', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'crossbow', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'frost_gloves', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'ring_of_health', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'ring_of_speed', chance: 1, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_magic', chance: 1, minQty: 1, maxQty: 1 },
        ]
    },

    // Lava mob drops
    lava_mob: {
        gold: { min: 5, max: 20, chance: 100 },
        items: [
            { id: 'gold_boots', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'gold_gloves', chance: 3, minQty: 1, maxQty: 1 },
            { id: 'gold_armor', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'crown', chance: 1, minQty: 1, maxQty: 1 },
            { id: 'windbow', chance: 1, minQty: 1, maxQty: 1 },
            { id: 'ring_of_crit', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'ring_of_fire', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_protection', chance: 2, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_speed', chance: 1, minQty: 1, maxQty: 1 },
        ]
    },

    // Elite mob drops (higher chance for rare items)
    elite: {
        gold: { min: 15, max: 40, chance: 100 },
        items: [
            { id: 'swift_boots', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'assassin_gloves', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'shadow_armor', chance: 6, minQty: 1, maxQty: 1 },
            { id: 'shadow_boots', chance: 6, minQty: 1, maxQty: 1 },
            { id: 'spell_gloves', chance: 6, minQty: 1, maxQty: 1 },
            { id: 'ring_of_magic', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'ring_of_protection', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_crit', chance: 5, minQty: 1, maxQty: 1 },
        ]
    },

    // Boss drops (high chance for epic/legendary)
    boss: {
        gold: { min: 100, max: 300, chance: 100 },
        items: [
            // Epic items
            { id: 'swift_boots', chance: 20, minQty: 1, maxQty: 1 },
            { id: 'spell_gloves', chance: 20, minQty: 1, maxQty: 1 },
            { id: 'shadow_armor', chance: 20, minQty: 1, maxQty: 1 },
            { id: 'crown', chance: 15, minQty: 1, maxQty: 1 },
            { id: 'windbow', chance: 15, minQty: 1, maxQty: 1 },
            { id: 'ring_of_magic', chance: 20, minQty: 1, maxQty: 1 },
            { id: 'ring_of_protection', chance: 20, minQty: 1, maxQty: 1 },
            { id: 'ring_of_fire', chance: 15, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_speed', chance: 15, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_crit', chance: 15, minQty: 1, maxQty: 1 },

            // Legendary items
            { id: 'dragon_boots', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'dragon_gloves', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'dragon_armor', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'dragon_helmet', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'ring_of_life', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'ring_of_power', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_swiftness', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_gods', chance: 3, minQty: 1, maxQty: 1 },
        ]
    },

    // Chest loot (can be found in world)
    chest: {
        gold: { min: 25, max: 100, chance: 95 },
        items: [
            { id: 'leather_boots', chance: 15, minQty: 1, maxQty: 1 },
            { id: 'iron_boots', chance: 10, minQty: 1, maxQty: 1 },
            { id: 'steel_boots', chance: 5, minQty: 1, maxQty: 1 },
            { id: 'short_bow', chance: 10, minQty: 1, maxQty: 1 },
            { id: 'long_bow', chance: 7, minQty: 1, maxQty: 1 },
            { id: 'ring_of_strength', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'ring_of_dexterity', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'ring_of_intellect', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_health', chance: 8, minQty: 1, maxQty: 1 },
            { id: 'amulet_of_strength', chance: 8, minQty: 1, maxQty: 1 },
        ]
    },
};

// Helper function to get random item from drop table
export function getRandomItemFromDropTable(dropTable) {
    if (!dropTable || !dropTable.items) return null;

    const roll = Math.random() * 100;
    let cumulativeChance = 0;

    for (const item of dropTable.items) {
        cumulativeChance += item.chance;
        if (roll <= cumulativeChance) {
            const quantity = Math.floor(Math.random() * (item.maxQty - item.minQty + 1)) + item.minQty;
            const baseItem = ItemDatabase[item.id];
            if (!baseItem) return null;

            // Create a copy of the item
            return {
                ...baseItem,
                quantity: quantity,
            };
        }
    }

    return null;
}

// Helper function to get random gold from drop table
export function getRandomGoldFromDropTable(dropTable) {
    if (!dropTable || !dropTable.gold) return 0;

    const roll = Math.random() * 100;
    if (roll <= dropTable.gold.chance) {
        return Math.floor(Math.random() * (dropTable.gold.max - dropTable.gold.min + 1)) + dropTable.gold.min;
    }
    return 0;
}

// Helper to get appropriate drop table for mob type
export function getDropTableForMob(mobType, biome) {
    // Priority: boss > elite > biome-specific > default
    if (mobType === 'boss') return DropTables.boss;
    if (mobType === 'elite') return DropTables.elite;

    // Biome-specific drops
    switch(biome) {
        case 'forest': return DropTables.forest_mob;
        case 'desert': return DropTables.desert_mob;
        case 'ice': return DropTables.ice_mob;
        case 'lava': return DropTables.lava_mob;
        default: return DropTables.forest_mob;
    }
}