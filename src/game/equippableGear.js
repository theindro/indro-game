// game/equippableGear.js — one item per rarity per equip slot (leather → void naming)
import { ItemTypes, ItemRarity } from './itemConstants.js';

/** @typedef {'common'|'magic'|'rare'|'epic'|'legendary'} GearTierKey */

export const GEAR_TIERS = [
    { key: 'common', tier: 'leather', label: 'Leather', rarity: ItemRarity.COMMON },
    { key: 'magic', tier: 'iron', label: 'Iron', rarity: ItemRarity.MAGIC },
    { key: 'rare', tier: 'shadow', label: 'Shadow', rarity: ItemRarity.RARE },
    { key: 'epic', tier: 'ancient', label: 'Ancient', rarity: ItemRarity.EPIC },
    { key: 'legendary', tier: 'void', label: 'Void', rarity: ItemRarity.LEGENDARY },
];

/** Mob gear drop — independent rolls per kill (tune in one place). */
export const MOB_GEAR_DROP_RATES = {
    common: 1 / 12,
    magic: 1 / 40,
    rare: 1 / 150,
    epic: 1 / 400,
    legendary: 0,
};

const SLOT_DEFS = [
    {
        slot: 'boots',
        type: ItemTypes.BOOTS,
        piece: 'Boots',
        textureIds: ['boots_1', 'boots_2', 'boots_3', 'boots_4', 'boots_5'],
        texturePaths: ['/rpg/armour/1.png', '/rpg/armour/2.png', '/rpg/armour/3.png', '/rpg/armour/4.png', '/rpg/armour/5.png'],
        baseStats: { armor: 5, moveSpeed: 0.08 },
        statGrowth: { armor: 4, moveSpeed: 0.04 },
    },
    {
        slot: 'gloves',
        type: ItemTypes.GLOVES,
        piece: 'Gloves',
        textureIds: ['gloves_16', 'gloves_17', 'gloves_18', 'gloves_20', 'gloves_21'],
        texturePaths: ['/rpg/armour/16.png', '/rpg/armour/17.png', '/rpg/armour/18.png', '/rpg/armour/20.png', '/rpg/armour/21.png'],
        baseStats: { armor: 3, attackSpeed: 2 },
        statGrowth: { armor: 3, attackSpeed: 2, strength: 2 },
    },
    {
        slot: 'chest',
        type: ItemTypes.ARMOR,
        piece: 'Chestplate',
        textureIds: ['chest_30', 'chest_31', 'chest_32', 'chest_35', 'chest_34'],
        texturePaths: ['/rpg/armour/30.png', '/rpg/armour/31.png', '/rpg/armour/32.png', '/rpg/armour/35.png', '/rpg/armour/34.png'],
        baseStats: { armor: 10, health: 25 },
        statGrowth: { armor: 8, health: 20, strength: 3 },
    },
    {
        slot: 'helmet',
        type: ItemTypes.HELMET,
        piece: 'Helmet',
        textureIds: ['helmet_48', 'helmet_49', 'helmet_50', 'helmet_51', 'helmet_52'],
        texturePaths: ['/rpg/armour/48.png', '/rpg/armour/49.png', '/rpg/armour/50.png', '/rpg/armour/51.png', '/rpg/armour/52.png'],
        baseStats: { armor: 4, health: 12 },
        statGrowth: { armor: 5, health: 15, strength: 2 },
    },
    {
        slot: 'weapon',
        type: ItemTypes.BOW,
        piece: 'Bow',
        equipSlot: 'weapon',
        textureIds: ['woodbow', 'crystalbow', 'woodbow', 'crystalbow', 'voidbow'],
        texturePaths: ['/gameprops/items/woodbow.png', '/gameprops/items/crystalbow.png', '/gameprops/items/woodbow.png', '/gameprops/items/crystalbow.png', '/gameprops/items/voidbow.png'],
        baseStats: { damage: 12, attackSpeed: 8, attackRange: 45 },
        statGrowth: { damage: 8, attackSpeed: 3, attackRange: 8, critChance: 1 },
    },
    {
        slot: 'ring',
        type: ItemTypes.RING,
        piece: 'Ring',
        textureIds: ['ring_90', 'ring_91', 'ring_93', 'ring_96', 'ring_99'],
        texturePaths: ['/rpg/armour/90.png', '/rpg/armour/91.png', '/rpg/armour/93.png', '/rpg/armour/96.png', '/rpg/armour/99.png'],
        baseStats: { strength: 4, damage: 3 },
        statGrowth: { strength: 4, damage: 4, critChance: 1 },
    },
    {
        slot: 'amulet',
        type: ItemTypes.AMULET,
        piece: 'Amulet',
        textureIds: ['amulet_107', 'amulet_108', 'amulet_109', 'amulet_111', 'amulet_113'],
        texturePaths: ['/rpg/armour/107.png', '/rpg/armour/108.png', '/rpg/armour/109.png', '/rpg/armour/111.png', '/rpg/armour/113.png'],
        baseStats: { health: 20, healthRegen: 1 },
        statGrowth: { health: 25, healthRegen: 1, allResist: 2 },
    },
];

const CRAFT_MATS = {
    common: {
        goldCost: 450,
        ingredients: [
            { id: 'wood_plank', quantity: 18 },
            { id: 'herb', quantity: 10 },
        ],
    },
    magic: {
        goldCost: 1200,
        ingredients: [
            { id: 'wood_plank', quantity: 14 },
            { id: 'iron_ingot', quantity: 14 },
            { id: 'herb', quantity: 8 },
        ],
    },
    rare: {
        goldCost: 3200,
        ingredients: [
            { id: 'iron_ingot', quantity: 22 },
            { id: 'gold_ingot', quantity: 10 },
            { id: 'crystal_shard', quantity: 6 },
        ],
    },
    epic: {
        goldCost: 8500,
        ingredients: [
            { id: 'iron_ingot', quantity: 28 },
            { id: 'gold_ingot', quantity: 18 },
            { id: 'crystal_shard', quantity: 12 },
            { id: 'lava_stone', quantity: 8 },
        ],
    },
    legendary: {
        goldCost: 22000,
        ingredients: [
            { id: 'gold_ingot', quantity: 28 },
            { id: 'crystal_shard', quantity: 18 },
            { id: 'lava_stone', quantity: 14 },
            { id: 'void_essence', quantity: 10 },
        ],
    },
};

const FRACTIONAL_STAT_KEYS = new Set(['moveSpeed', 'attackSpeed', 'dodge', 'goldFind', 'lifeSteal']);

function scaleStats(base, growth, tierIndex) {
    const mul = GEAR_TIERS[tierIndex].rarity.multiplier;
    const out = {};
    for (const [k, v] of Object.entries(base)) {
        const g = growth[k] ?? 0;
        const scaled = (v + g * tierIndex) * mul;
        out[k] = FRACTIONAL_STAT_KEYS.has(k)
            ? Math.round(scaled * 100) / 100
            : Math.floor(scaled);
    }
    if (tierIndex >= 3 && !out.critChance && growth.critChance) {
        out.critChance = Math.floor(growth.critChance * tierIndex * 0.8);
    }
    return out;
}

function buildGearId(tierPrefix, slotKey) {
    if (slotKey === 'weapon') return `${tierPrefix}_bow`;
    return `${tierPrefix}_${slotKey === 'chest' ? 'armor' : slotKey}`;
}

/** @type {Record<GearTierKey, string[]>} */
export const GEAR_IDS_BY_TIER = {
    common: [],
    magic: [],
    rare: [],
    epic: [],
    legendary: [],
};

export const EquippableGearItems = {};

for (let ti = 0; ti < GEAR_TIERS.length; ti++) {
    const tier = GEAR_TIERS[ti];
    for (const def of SLOT_DEFS) {
        const id = buildGearId(tier.tier, def.slot);
        const equipSlot = def.equipSlot ?? def.slot;
        const name =
            def.slot === 'weapon'
                ? `${tier.label} Bow`
                : `${tier.label} ${def.piece}`;

        EquippableGearItems[id] = {
            id,
            name,
            type: def.type,
            rarity: tier.rarity,
            icon: def.type === ItemTypes.BOW ? '🏹' : '🛡️',
            texture: def.texturePaths[ti],
            textureId: def.textureIds[ti],
            price: Math.floor(40 * tier.rarity.multiplier * (ti + 1) * 12),
            equipSlot,
            description: `${tier.label} tier ${def.piece.toLowerCase()}.`,
            stats: scaleStats(def.baseStats, def.statGrowth, ti),
        };

        GEAR_IDS_BY_TIER[tier.key].push(id);
    }
}

/** Crafting recipes for every equippable piece. */
export const GearCraftingRecipes = [];

for (let ti = 0; ti < GEAR_TIERS.length; ti++) {
    const tier = GEAR_TIERS[ti];
    const mats = CRAFT_MATS[tier.key];
    for (const def of SLOT_DEFS) {
        const result = buildGearId(tier.tier, def.slot);
        GearCraftingRecipes.push({
            id: `craft_${result}`,
            result,
            goldCost: mats.goldCost,
            ingredients: [...mats.ingredients],
            category: def.slot,
            tier: tier.key,
        });
    }
}

export function pickRandomGearId(tierKey) {
    const pool = GEAR_IDS_BY_TIER[tierKey];
    if (!pool?.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Independent rarity rolls for normal mobs. */
export function rollMobGearDropIds() {
    const ids = [];
    if (Math.random() < MOB_GEAR_DROP_RATES.common) {
        const id = pickRandomGearId('common');
        if (id) ids.push(id);
    }
    if (Math.random() < MOB_GEAR_DROP_RATES.magic) {
        const id = pickRandomGearId('magic');
        if (id) ids.push(id);
    }
    if (Math.random() < MOB_GEAR_DROP_RATES.rare) {
        const id = pickRandomGearId('rare');
        if (id) ids.push(id);
    }
    if (Math.random() < MOB_GEAR_DROP_RATES.epic) {
        const id = pickRandomGearId('epic');
        if (id) ids.push(id);
    }
    return ids;
}

/** Boss: several magic/rare, few epic, small legendary chance. */
export function rollBossGearDropIds() {
    const ids = [];
    const add = (tier, chance) => {
        if (Math.random() < chance) {
            const id = pickRandomGearId(tier);
            if (id) ids.push(id);
        }
    };

    for (let i = 0; i < 4; i++) add('magic', 0.75);
    for (let i = 0; i < 3; i++) add('rare', 0.65);
    for (let i = 0; i < 2; i++) add('epic', 0.4);
    add('legendary', 0.12);
    return ids;
}
