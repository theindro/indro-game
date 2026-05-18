// propConfig.js - Simplified with multiple variants
export const PROP_TYPES = {
    // Stone has multiple variants
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
    TREE: {
        name: 'tree',
        variants: ['tree1', 'tree2', 'tree3', 'tree4', 'tree5'],
        collision: false,
        collisionType: 'rect',
        minDistance: 80,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.9, max: 1.0 }
    },
    SNOW_TREE: {
        name: 'tree',
        variants: ['log_pile', 'dead_tree'],
        collision: false,
        collisionType: 'rect',
        minDistance: 80,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.15, max: 0.25 }
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
    CACTUS: {
        name: 'cactus',
        variants: [],
        collision: true,
        collisionType: 'auto',
        minDistance: 60,
        margin: 0.75,
        damageOnTouch: 0,
        scaleRange: { min: 0.6, max: 1.0 }
    }
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
        density: 1.0,
        props: [
            { type: 'STONE', weight: 10 },
            { type: 'TREE', weight: 30 },
            { type: 'BUSH', weight: 40 },
        ],
    },
    desert: {
        density: 0.5,  // Root level
        props: [
            { type: 'STONE', weight: 100 },
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
            { type: 'STONE', weight: 70 },
        ]
    }
};
