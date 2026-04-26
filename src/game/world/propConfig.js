// propConfig.js - Simplified with multiple variants
export const PROP_TYPES = {
    // Stone has multiple variants
    STONE: {
        name: 'stone',
        variants: ['stone1', 'stone2', 'stone3', 'stone4', 'stone5', 'stone6', 'stone7', 'stone8'],
        collision: true,
        collisionType: 'auto',
        minDistance: 500,  // Stones can be closer together
        margin: 0.7,
        damageOnTouch: 0,
        scaleRange: { min: 0.6, max: 0.6}  // Random size variation
    },
    BIG_STONE: {
        name: 'big_stone',
        variants: [],
        collision: true,
        collisionType: 'auto',
        minDistance: 50,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.5, max: 0.7 }
    },
    TREE: {
        name: 'tree',
        variants: ['tree1', 'tree2', 'tree3'],
        collision: false,
        collisionType: 'rect',
        minDistance: 80,
        margin: 0.8,
        damageOnTouch: 0,
        scaleRange: { min: 0.9, max: 1.0 }
    },
    BUSH: {
        name: 'bush',
        variants: ['bush1', 'bush2', 'bush3'],
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

// Biome configurations - Easy to adjust density per biome
// propConfig.js - Move density to root level
export const BIOME_PROP_CONFIG = {
    forest: {
        density: 3,  // Move density here (root level)
        props: [
            { type: 'STONE', weight: 10 },
            { type: 'TREE', weight: 30 },
            { type: 'BUSH', weight: 40 },
        ]
    },
    desert: {
        density: 0.5,  // Root level
        props: [
            { type: 'STONE', weight: 100 },
        ]
    },
    ice: {
        density: 0.6,  // Root level
        props: [
            { type: 'STONE', weight: 35 },
        ]
    },
    lava: {
        density: 0.5,  // Root level
        props: [
            { type: 'STONE', weight: 70 },
        ]
    }
};
