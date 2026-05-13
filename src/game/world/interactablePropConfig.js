// world/interactablePropConfig.js
// ─────────────────────────────────────────────────────────────────────────────
// Defines every interactable prop type and per-biome spawn tables.
// Tweak `intensity` (0–1) per biome entry to control how often a category
// appears relative to the others.  weight controls within-category frequency.
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical prop type definitions */
export const INTERACTABLE_PROP_TYPES = {

    // ── Chests ──────────────────────────────────────────────────────────────
    chest_wood: {
        id: 'chest_wood',
        label: 'Wooden Chest',
        category: 'chest',
        radius: 28,          // collision circle radius (px)
        interactRange: 80,   // how close player must be to interact (px)
        respawnTime: null,   // null = never respawn
        lootTable: 'chest_wood',
        texture: 'chest_wood',
        fallbackColor: 0x8B5E3C,
        scaleRange: { min: 0.55, max: 0.75 },
        glowColor: 0xffcc44,
        sound: 'chest_open',
    },

    chest_iron: {
        id: 'chest_iron',
        label: 'Iron Chest',
        category: 'chest',
        radius: 30,
        interactRange: 80,
        respawnTime: null,
        lootTable: 'chest_iron',
        texture: 'chest_iron',
        fallbackColor: 0x7a8fa6,
        scaleRange: { min: 0.55, max: 0.75 },
        glowColor: 0x88ccff,
        sound: 'chest_open',
    },

    chest_gold: {
        id: 'chest_gold',
        label: 'Gold Chest',
        category: 'chest',
        radius: 32,
        interactRange: 90,
        respawnTime: null,
        lootTable: 'chest_gold',
        texture: 'chest_gold',
        fallbackColor: 0xffd700,
        scaleRange: { min: 0.6, max: 0.8 },
        glowColor: 0xffee88,
        sound: 'chest_open',
    },

    chest_ancient: {
        id: 'chest_ancient',
        label: 'Ancient Chest',
        category: 'chest',
        radius: 36,
        interactRange: 100,
        respawnTime: null,
        lootTable: 'chest_ancient',
        texture: 'chest_ancient',
        fallbackColor: 0x9b59b6,
        scaleRange: { min: 0.65, max: 0.85 },
        glowColor: 0xcc44ff,
        sound: 'chest_open',
        rare: true,
    },

    // ── Wood / Timber ────────────────────────────────────────────────────────
    log_pile: {
        id: 'log_pile',
        label: 'Log Pile',
        category: 'wood',
        radius: 40,
        interactRange: 70,
        respawnTime: 300_000,
        lootTable: 'wood',
        texture: 'log_pile',
        fallbackColor: 0x6b3a2a,
        scaleRange: { min: 0.7, max: 1.0 },
        glowColor: 0xcc8833,
        harvestTime: 1.5,          // seconds
        harvestYield: { min: 2, max: 6 },
    },

    dead_tree: {
        id: 'dead_tree',
        label: 'Dead Tree',
        category: 'wood',
        radius: 22,
        interactRange: 70,
        respawnTime: 600_000,
        lootTable: 'wood_branch',
        texture: 'dead_tree',
        fallbackColor: 0x5c4033,
        scaleRange: { min: 0.9, max: 1.4 },
        glowColor: 0xbb7722,
        harvestTime: 0.8,          // seconds
        harvestYield: { min: 1, max: 3 },
    },

    // ── Ore / Metal ──────────────────────────────────────────────────────────
    ore_iron: {
        id: 'ore_iron',
        label: 'Iron Ore',
        category: 'metal',
        radius: 40,
        interactRange: 100,
        respawnTime: 180_000,
        lootTable: 'ore_iron',
        texture: 'ore_iron',
        fallbackColor: 0x8fa0b0,
        scaleRange: { min: 1, max: 2.5 },
        glowColor: 0xaabbcc,
        harvestTime: 2.0,          // seconds
        harvestYield: { min: 1, max: 3 },
    },

    ore_gold: {
        id: 'ore_gold',
        label: 'Gold Ore',
        category: 'metal',
        radius: 26,
        interactRange: 70,
        respawnTime: 300_000,
        lootTable: 'ore_gold',
        texture: 'ore_gold',
        fallbackColor: 0xe8c000,
        scaleRange: { min: 1, max: 1.75 },
        glowColor: 0xffdd33,
        harvestTime: 2.5,          // seconds
        harvestYield: { min: 1, max: 2 },
    },

    ore_crystal: {
        id: 'ore_crystal',
        label: 'Crystal Vein',
        category: 'metal',
        radius: 24,
        interactRange: 70,
        respawnTime: 600_000,
        lootTable: 'ore_crystal',
        texture: 'ore_crystal',
        fallbackColor: 0x44eecc,
        scaleRange: { min: 1.5, max: 3 },
        glowColor: 0x66ffee,
        harvestTime: 3.0,          // seconds
        harvestYield: { min: 1, max: 2 },
        rare: true,
    },

    ore_lava: {
        id: 'ore_lava',
        label: 'Lava Stone',
        category: 'metal',
        radius: 30,
        interactRange: 70,
        respawnTime: 240_000,
        lootTable: 'ore_lava',
        texture: 'ore_lava',
        fallbackColor: 0xff4400,
        scaleRange: { min: 0.55, max: 0.8 },
        glowColor: 0xff6600,
        harvestTime: 2.2,          // seconds
        harvestYield: { min: 1, max: 3 },
    },

    // ── Plants / Herbs ───────────────────────────────────────────────────────
    herb_green: {
        id: 'herb_green',
        label: 'Herb',
        category: 'herb',
        radius: 14,
        interactRange: 60,
        respawnTime: 120_000,
        lootTable: 'herb_green',
        texture: 'herb_green',
        fallbackColor: 0x44bb44,
        scaleRange: { min: 0.4, max: 0.7 },
        glowColor: 0x88ff88,
        harvestTime: 0.5,          // seconds
        harvestYield: { min: 1, max: 3 },
    },

    herb_ice: {
        id: 'herb_ice',
        label: 'Frostbloom',
        category: 'herb',
        radius: 14,
        interactRange: 60,
        respawnTime: 180_000,
        lootTable: 'herb_ice',
        texture: 'herb_ice',
        fallbackColor: 0xaaddff,
        scaleRange: { min: 0.4, max: 0.65 },
        glowColor: 0xccffff,
        harvestTime: 0.5,          // seconds
        harvestYield: { min: 1, max: 2 },
    },

    // ── Barrels / Crates ─────────────────────────────────────────────────────
    barrel: {
        id: 'barrel',
        label: 'Barrel',
        category: 'container',
        radius: 22,
        interactRange: 70,
        respawnTime: 120_000,
        lootTable: 'barrel',
        texture: 'barrel',
        fallbackColor: 0x8B4513,
        scaleRange: { min: 0.5, max: 0.75 },
        glowColor: 0xcc8833,
    },

    crate: {
        id: 'crate',
        label: 'Crate',
        category: 'container',
        radius: 26,
        interactRange: 70,
        respawnTime: 120_000,
        lootTable: 'crate',
        texture: 'crate',
        fallbackColor: 0xbb8855,
        scaleRange: { min: 0.55, max: 0.8 },
        glowColor: 0xddaa55,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-biome spawn configuration
//
// intensity   0–1  overall probability this category appears at all in a chunk.
//             0 = never, 1 = every eligible chunk spawns at least one.
// maxPerChunk maximum instances of this category per chunk
// weight      relative frequency within the category's pool
// ─────────────────────────────────────────────────────────────────────────────
export const BIOME_INTERACTABLE_CONFIG = {

    forest: {
        // Chests appear in ~30% of chunks, max 1 per chunk
        chest: {
            intensity: 0.1,
            maxPerChunk: 1,
            minDistance: 200,
            props: [
                { type: 'chest_wood',  weight: 6 },
                { type: 'chest_iron',  weight: 3 },
                { type: 'chest_gold',  weight: 1 },
            ],
        },
        wood: {
            intensity: 0.4,
            maxPerChunk: 4,
            minDistance: 120,
            props: [
                { type: 'log_pile',  weight: 5 },
                { type: 'dead_tree', weight: 3 },
            ],
        },
        metal: {
            intensity: 0.1,
            maxPerChunk: 2,
            minDistance: 150,
            props: [
                { type: 'ore_iron', weight: 7 },
                { type: 'ore_gold', weight: 2 },
            ],
        },
        herb: {
            intensity: 0.4,
            maxPerChunk: 3,
            minDistance: 60,
            props: [
                { type: 'herb_green', weight: 1 },
            ],
        },
        container: {
            intensity: 0.20,
            maxPerChunk: 2,
            minDistance: 100,
            props: [
                { type: 'barrel', weight: 3 },
                { type: 'crate',  weight: 2 },
            ],
        },
    },

    desert: {
        chest: {
            intensity: 0.15,
            maxPerChunk: 1,
            minDistance: 250,
            props: [
                { type: 'chest_wood',   weight: 3 },
                { type: 'chest_iron',   weight: 4 },
                { type: 'chest_ancient', weight: 2 },
            ],
        },
        wood: {
            intensity: 0.20,
            maxPerChunk: 2,
            minDistance: 200,
            props: [
                { type: 'dead_tree', weight: 1 },
            ],
        },
        metal: {
            intensity: 0.50,
            maxPerChunk: 3,
            minDistance: 130,
            props: [
                { type: 'ore_iron', weight: 5 },
                { type: 'ore_gold', weight: 4 },
            ],
        },
        herb: {
            intensity: 0.20,
            maxPerChunk: 2,
            minDistance: 80,
            props: [
                { type: 'herb_green', weight: 1 },
            ],
        },
        container: {
            intensity: 0.30,
            maxPerChunk: 2,
            minDistance: 120,
            props: [
                { type: 'barrel', weight: 2 },
                { type: 'crate',  weight: 3 },
            ],
        },
    },

    ice: {
        chest: {
            intensity: 0.20,
            maxPerChunk: 1,
            minDistance: 220,
            props: [
                { type: 'chest_wood',   weight: 2 },
                { type: 'chest_iron',   weight: 5 },
                { type: 'chest_gold',   weight: 2 },
                { type: 'chest_ancient', weight: 1 },
            ],
        },
        wood: {
            intensity: 0.30,
            maxPerChunk: 2,
            minDistance: 160,
            props: [
                { type: 'dead_tree', weight: 1 },
            ],
        },
        metal: {
            intensity: 0.60,
            maxPerChunk: 3,
            minDistance: 120,
            props: [
                { type: 'ore_iron',    weight: 4 },
                { type: 'ore_crystal', weight: 5 },
            ],
        },
        herb: {
            intensity: 0.40,
            maxPerChunk: 3,
            minDistance: 70,
            props: [
                { type: 'herb_ice', weight: 1 },
            ],
        },
        container: {
            intensity: 0.15,
            maxPerChunk: 1,
            minDistance: 150,
            props: [
                { type: 'barrel', weight: 1 },
                { type: 'crate',  weight: 1 },
            ],
        },
    },

    lava: {
        chest: {
            intensity: 0.25,
            maxPerChunk: 1,
            minDistance: 230,
            props: [
                { type: 'chest_iron',   weight: 3 },
                { type: 'chest_gold',   weight: 4 },
                { type: 'chest_ancient', weight: 3 },
            ],
        },
        wood: {
            intensity: 0.05,
            maxPerChunk: 1,
            minDistance: 300,
            props: [
                { type: 'dead_tree', weight: 1 },
            ],
        },
        metal: {
            intensity: 0.70,
            maxPerChunk: 4,
            minDistance: 110,
            props: [
                { type: 'ore_iron',    weight: 3 },
                { type: 'ore_gold',    weight: 3 },
                { type: 'ore_lava',    weight: 6 },
                { type: 'ore_crystal', weight: 2 },
            ],
        },
        herb: {
            intensity: 0.05,
            maxPerChunk: 1,
            minDistance: 200,
            props: [
                { type: 'herb_green', weight: 1 },
            ],
        },
        container: {
            intensity: 0.25,
            maxPerChunk: 2,
            minDistance: 130,
            props: [
                { type: 'barrel', weight: 1 },
                { type: 'crate',  weight: 2 },
            ],
        },
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Loot tables  —  drop pools keyed by lootTable id.
// Each entry: { id, chance 0-1, min, max }
// ─────────────────────────────────────────────────────────────────────────────
export const LOOT_TABLES = {

    chest_wood: [
        { id: 'gold',         chance: 1.0, min: 5,  max: 30  },
        { id: 'herb_green',   chance: 0.5, min: 1,  max: 3   },
        { id: 'ore_iron',     chance: 0.3, min: 1,  max: 2   },
    ],

    chest_iron: [
        { id: 'gold',         chance: 1.0, min: 20,  max: 80  },
        { id: 'ore_iron',     chance: 0.7, min: 2,   max: 5   },
        { id: 'ore_gold',     chance: 0.3, min: 1,   max: 2   },
        { id: 'void_essence', chance: 0.1, min: 1,   max: 1   },
    ],

    chest_gold: [
        { id: 'gold',         chance: 1.0, min: 50,  max: 200 },
        { id: 'ore_gold',     chance: 0.8, min: 2,   max: 6   },
        { id: 'ore_crystal',  chance: 0.4, min: 1,   max: 2   },
        { id: 'void_essence', chance: 0.3, min: 1,   max: 2   },
    ],

    chest_ancient: [
        { id: 'gold',         chance: 1.0, min: 100, max: 500 },
        { id: 'ore_crystal',  chance: 0.9, min: 3,   max: 8   },
        { id: 'void_essence', chance: 0.8, min: 2,   max: 5   },
    ],

    wood: [
        { id: 'wood_plank',   chance: 1.0, min: 2,  max: 6  },
        { id: 'gold',         chance: 0.1, min: 1,  max: 5  },
    ],

    wood_branch: [
        { id: 'wood_plank',   chance: 1.0, min: 1,  max: 3  },
    ],

    ore_iron: [
        { id: 'iron_ingot',   chance: 1.0, min: 1,  max: 3  },
        { id: 'gold',         chance: 0.2, min: 1,  max: 5  },
    ],

    ore_gold: [
        { id: 'gold_ingot',   chance: 1.0, min: 1,  max: 2  },
        { id: 'gold',         chance: 0.5, min: 5,  max: 20 },
    ],

    ore_crystal: [
        { id: 'crystal_shard', chance: 1.0, min: 1, max: 2  },
        { id: 'void_essence',  chance: 0.3, min: 1, max: 1  },
    ],

    ore_lava: [
        { id: 'lava_stone',   chance: 1.0, min: 1,  max: 3  },
        { id: 'iron_ingot',   chance: 0.4, min: 1,  max: 2  },
    ],

    herb_green: [
        { id: 'herb',         chance: 1.0, min: 1,  max: 3  },
        { id: 'gold',         chance: 0.1, min: 1,  max: 3  },
    ],

    herb_ice: [
        { id: 'frostbloom',   chance: 1.0, min: 1,  max: 2  },
    ],

    barrel: [
        { id: 'gold',         chance: 0.8, min: 1,  max: 15 },
        { id: 'herb',         chance: 0.4, min: 1,  max: 2  },
        { id: 'wood_plank',   chance: 0.3, min: 1,  max: 3  },
    ],

    crate: [
        { id: 'gold',         chance: 0.7, min: 2,  max: 20 },
        { id: 'iron_ingot',   chance: 0.5, min: 1,  max: 3  },
        { id: 'ore_iron',     chance: 0.3, min: 1,  max: 2  },
    ],
};