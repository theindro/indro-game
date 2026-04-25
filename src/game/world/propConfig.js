// propConfig.js - Simplified with minDistance
export const PROP_TYPES = {
    TREE: {
        name: 'tree',
        collision: true,
        collisionType: 'auto',
        minDistance: 80,  // How close same type can spawn
        margin: 0.8,
        damageOnTouch: 0
    },
    BUSH: {
        name: 'bush',
        collision: true,
        collisionType: 'auto',
        minDistance: 40,
        margin: 0.7,
        damageOnTouch: 0
    },
    ROCK: {
        name: 'rock',
        collision: true,
        collisionType: 'auto',
        minDistance: 50,
        margin: 0.85,
        damageOnTouch: 0
    },
    FLOWER: {
        name: 'flower',
        collision: false,
        collisionType: 'none',
        minDistance: 25,
        margin: 0,
        damageOnTouch: 0
    },
    CACTUS: {
        name: 'cactus',
        collision: true,
        collisionType: 'auto',
        minDistance: 60,
        margin: 0.75,
        damageOnTouch: 0
    },
    LAVA_ROCK: {
        name: 'lava_rock',
        collision: true,
        collisionType: 'auto',
        minDistance: 70,  // Lava rocks need more space
        margin: 0.8,
        damageOnTouch: 3
    }
};

// Biome configurations
export const BIOME_PROP_CONFIG = {
    forest: {
        props: [
            { type: 'TREE', weight: 40 },
            { type: 'BUSH', weight: 30 },
            { type: 'FLOWER', weight: 20 },
            { type: 'ROCK', weight: 10 }
        ],
        density: 0.8  // 0-1 scale
    },
    desert: {
        props: [
            { type: 'CACTUS', weight: 50 },
            { type: 'ROCK', weight: 30 },
            { type: 'BUSH', weight: 20 }
        ],
        density: 0.5
    },
    ice: {
        props: [
            { type: 'TREE', weight: 40 },
            { type: 'ROCK', weight: 30 },
            { type: 'FLOWER', weight: 30 }
        ],
        density: 0.6
    },
    lava: {
        props: [
            { type: 'LAVA_ROCK', weight: 50 },
            { type: 'TREE', weight: 50 }
        ],
        density: 0.4
    }
};