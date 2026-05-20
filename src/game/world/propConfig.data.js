// propConfig.js - Simplified with multiple variants
//
// collisionType: 'auto' | 'rect' | 'none'
//   rect — fixed box at prop foot (bottom-center); optional rectWidth / rectHeight (default 50)
export const PROP_TYPES = {
    // FOREST
    STONE: {
        name: 'stone',
        variants: ['stone1', 'stone2', 'stone3', 'stone4', 'stone5', 'stone6', 'stone7', 'stone8', 'stone9', 'stone10'],
        collision: true,
        collisionType: 'auto',
        minDistance: 500,  // Stones can be closer together
        margin: 0.7,
        damageOnTouch: 0,
        scaleRange: { min: 0.6, max: 0.6}  // Random size variation
    },
    TREE: {
        name: 'tree',
        variants: ['tree1', 'tree2', 'tree3', 'tree4', 'tree5'],
        collision: false,
        minDistance: 80,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.9, max: 1.0 }
    },
    BUSH: {
        name: 'bush',
        variants: ['bush1', 'bush2', 'bush3', 'bush4', 'bush5', 'bush6'],
        collision: false,
        collisionType: 'auto',
        minDistance: 40,
        margin: 0.7,
        damageOnTouch: 0,
        scaleRange: { min: 0.7, max: 0.8}
    },
    FLOWER: {
        name: 'flower',
        variants: ['flower'],
        collision: false,
        collisionType: 'none',
        minDistance: 25,
        margin: 0,
        damageOnTouch: 0,
        scaleRange: { min: 0.4, max: 0.7 }
    },
    // ICE
    SNOW_STONE: {
        name: 'snow_stone',
        variants: ['snowstone1', 'snowstone2', 'snowstone3' , 'snowstone4', 'snowstone5'],
        collision: true,
        collisionType: 'auto',
        minDistance: 500,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.5, max: 0.7 }
    },
    SNOW_TREE: {
        name: 'tree',
        variants: ['snow_tree', 'snow_tree_2', 'snow_tree_3', 'snow_tree_4'],
        collision: false,
        minDistance: 80,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.4, max: 0.5 }
    },
    // DESERT
    DESERT_TREE: {
        name: 'tree',
        variants: ['desert_tree', 'desert_tree_2', 'desert_tree_3', 'desert_tree_4'],
        collision: false,
        minDistance: 80,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.5, max: 0.75 }
    },
    CACTUS: {
        name: 'cactus',
        variants: ['desert_cactus', 'desert_cactus_2', 'desert_cactus_3', 'desert_cactus_4'],
        collision: true,
        collisionType: 'rect',
        rectWidth: 42,
        rectHeight: 50,
        minDistance: 60,
        margin: 0.75,
        damageOnTouch: 1,
        scaleRange: { min: 0.5, max: 0.8 }
    },
    DESERT_BUSH: {
        name: 'bush',
        variants: ['desert_bush', 'desert_bush_2'],
        collision: false,
        collisionType: 'none',
        minDistance: 60,
        margin: 0.75,
        damageOnTouch: 0,
        scaleRange: { min: 0.2, max: 0.5 }
    },
    // lava
    LAVA_STONE: {
        name: 'lava_stone',
        variants: ['lava_stone', 'lava_stone_2', 'lava_stone_3', 'lava_stone_4'],
        collision: true,
        collisionType: 'auto',
        minDistance: 500,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.5, max: 0.7 }
    },
};

/**
 * Per-asset shadow tweaks (world pixels, relative to prop foot at anchor 0.5, 1).
 * @type {Record<string, { offsetX?: number, offsetY?: number, scaleYMul?: number }>}
 *
 * offsetY: negative moves shadow up (toward top of screen), positive moves down.
 * Example: stone5 sits low in its texture — nudge shadow up so it reads on the ground.
 */
export const PROP_SHADOW_OVERRIDES = {
    stone1: { offsetY: -50 },
    stone2: { offsetY: -50 },
    stone3: { offsetY: -50 },
    stone4: { offsetY: -50 },
    stone5: { offsetY: -50 },
    stone6: { offsetY: -50 },
    stone7: { offsetY: -50 },
    stone8: { offsetY: -50 },
    snowstone1: { offsetY: -50 },
    snowstone2: { offsetY: -50 },
    snowstone3: { offsetY: -50 },
    snowstone4: { offsetY: -50 },
    snowstone5: { offsetY: -50 },
    lava_stone_4: { offsetY: -20 },
    lava_stone_3: { offsetY: -20 },
    lava_stone_2: { offsetY: -50 },

};

/** @param {string | null | undefined} assetId */
export function getPropShadowOverride(assetId) {
    if (!assetId) return null;
    return PROP_SHADOW_OVERRIDES[assetId] ?? null;
}

/** Resolve procedural prop definition from a placed asset id (e.g. tree2, snowstone1). */
export function getPropTypeByAssetId(assetId) {
    if (!assetId) return null;
    for (const def of Object.values(PROP_TYPES)) {
        if (def.name === assetId) return def;
        if (def.variants?.includes(assetId)) return def;
    }
    return null;
}

// Legacy biome-wide fallback (forest uses chunkProfiles.data.js per-chunk identity).
export const BIOME_PROP_CONFIG = {
    forest: {
        density: 2.6,
        props: [
            { type: 'STONE', weight: 6 },
            { type: 'TREE', weight: 44 },
            { type: 'BUSH', weight: 50 },
        ],
    },
    desert: {
        density: 0.5,  // Root level
        props: [
            { type: 'CACTUS', weight: 50 },
            { type: 'DESERT_TREE', weight: 25 },
            { type: 'DESERT_BUSH', weight: 25 },
        ]
    },
    ice: {
        density: 0.5,  // Root level
        props: [
            { type: 'SNOW_STONE', weight: 35 },
        ]
    },
    lava: {
        density: 0.5,  // Root level
        props: [
            { type: 'LAVA_STONE', weight: 70 },
        ]
    }
};
