/**
 * Fixed arena decorations for special chunk profiles (normalized chunk coords 0–1).
 * @typedef {{ assetId: string, nx: number, nz: number, scale?: number, collision?: boolean }} ArenaPlacement
 */

/** Forest grove — tree ring, stones, bushes (Tree Grove boss). */
export const BOSS_ARENA_PLACEMENT = /** @type {ArenaPlacement[]} */ ([
    { assetId: 'tree2', nx: 0.22, nz: 0.12, scale: 1.05, collision: false },
    { assetId: 'tree3', nx: 0.38, nz: 0.1, scale: 1.1, collision: false },
    { assetId: 'tree1', nx: 0.52, nz: 0.11, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.68, nz: 0.13, scale: 1.08, collision: false },
    { assetId: 'tree3', nx: 0.82, nz: 0.18, scale: 1.05, collision: false },
    { assetId: 'tree1', nx: 0.88, nz: 0.32, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.9, nz: 0.48, scale: 1.12, collision: false },
    { assetId: 'tree3', nx: 0.87, nz: 0.64, scale: 1.05, collision: false },
    { assetId: 'tree1', nx: 0.84, nz: 0.78, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.72, nz: 0.86, scale: 1.08, collision: false },
    { assetId: 'tree3', nx: 0.55, nz: 0.9, scale: 1.1, collision: false },
    { assetId: 'tree1', nx: 0.38, nz: 0.88, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.22, nz: 0.84, scale: 1.05, collision: false },
    { assetId: 'tree3', nx: 0.12, nz: 0.72, scale: 1.05, collision: false },
    { assetId: 'tree1', nx: 0.1, nz: 0.52, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.11, nz: 0.34, scale: 1.08, collision: false },
    { assetId: 'stone4', nx: 0.18, nz: 0.2, scale: 0.75, collision: true },
    { assetId: 'stone5', nx: 0.8, nz: 0.22, scale: 0.8, collision: true },
    { assetId: 'stone6', nx: 0.78, nz: 0.76, scale: 0.78, collision: true },
    { assetId: 'stone7', nx: 0.2, nz: 0.78, scale: 0.82, collision: true },
    { assetId: 'bush2', nx: 0.3, nz: 0.28, scale: 0.9, collision: false },
    { assetId: 'bush3', nx: 0.7, nz: 0.3, scale: 0.85, collision: false },
    { assetId: 'bush1', nx: 0.72, nz: 0.68, scale: 0.9, collision: false },
    { assetId: 'bush2', nx: 0.28, nz: 0.7, scale: 0.88, collision: false },
    { assetId: 'bush3', nx: 0.5, nz: 0.22, scale: 0.8, collision: false },
    { assetId: 'bush1', nx: 0.5, nz: 0.78, scale: 0.82, collision: false },
    { assetId: 'tree3', nx: 0.42, nz: 0.32, scale: 1.25, collision: false },
    { assetId: 'tree2', nx: 0.58, nz: 0.32, scale: 1.2, collision: false },
    { assetId: 'tree3', nx: 0.42, nz: 0.68, scale: 1.22, collision: false },
    { assetId: 'tree2', nx: 0.58, nz: 0.68, scale: 1.18, collision: false },
]);

/** Sand Titan arena — desert trees, cacti, and bushes (open center). */
export const DESERT_BOSS_ARENA_PLACEMENT = /** @type {ArenaPlacement[]} */ ([
    { assetId: 'desert_cactus', nx: 0.2, nz: 0.11, scale: 0.72, collision: true },
    { assetId: 'desert_cactus_2', nx: 0.35, nz: 0.09, scale: 0.68, collision: true },
    { assetId: 'desert_cactus_3', nx: 0.5, nz: 0.1, scale: 0.75, collision: true },
    { assetId: 'desert_cactus_4', nx: 0.65, nz: 0.11, scale: 0.7, collision: true },
    { assetId: 'desert_cactus', nx: 0.8, nz: 0.14, scale: 0.74, collision: true },
    { assetId: 'desert_cactus_2', nx: 0.88, nz: 0.28, scale: 0.7, collision: true },
    { assetId: 'desert_cactus_3', nx: 0.9, nz: 0.44, scale: 0.76, collision: true },
    { assetId: 'desert_cactus_4', nx: 0.87, nz: 0.6, scale: 0.72, collision: true },
    { assetId: 'desert_cactus', nx: 0.84, nz: 0.74, scale: 0.7, collision: true },
    { assetId: 'desert_cactus_2', nx: 0.72, nz: 0.84, scale: 0.74, collision: true },
    { assetId: 'desert_cactus_3', nx: 0.55, nz: 0.88, scale: 0.68, collision: true },
    { assetId: 'desert_cactus_4', nx: 0.38, nz: 0.86, scale: 0.72, collision: true },
    { assetId: 'desert_cactus', nx: 0.22, nz: 0.82, scale: 0.7, collision: true },
    { assetId: 'desert_cactus_2', nx: 0.11, nz: 0.68, scale: 0.68, collision: true },
    { assetId: 'desert_cactus_3', nx: 0.1, nz: 0.5, scale: 0.72, collision: true },
    { assetId: 'desert_cactus_4', nx: 0.11, nz: 0.32, scale: 0.7, collision: true },
    { assetId: 'desert_tree', nx: 0.16, nz: 0.18, scale: 0.75, collision: true },
    { assetId: 'desert_tree_2', nx: 0.84, nz: 0.2, scale: 0.75, collision: true },
    { assetId: 'desert_tree_3', nx: 0.82, nz: 0.78, scale: 0.6, collision: true },
    { assetId: 'desert_tree_4', nx: 0.18, nz: 0.76, scale: 0.7, collision: true },
    { assetId: 'desert_bush', nx: 0.3, nz: 0.26, scale: 0.38, collision: false },
    { assetId: 'desert_bush_2', nx: 0.7, nz: 0.28, scale: 0.35, collision: false },
    { assetId: 'desert_bush', nx: 0.72, nz: 0.66, scale: 0.4, collision: false },
    { assetId: 'desert_bush_2', nx: 0.28, nz: 0.68, scale: 0.36, collision: false },
    { assetId: 'desert_bush', nx: 0.5, nz: 0.2, scale: 0.32, collision: false },
    { assetId: 'desert_bush_2', nx: 0.5, nz: 0.76, scale: 0.34, collision: false },
    { assetId: 'desert_tree_2', nx: 0.4, nz: 0.3, scale: 0.75, collision: true },
    { assetId: 'desert_tree_3', nx: 0.6, nz: 0.3, scale: 0.6, collision: true },
    { assetId: 'desert_tree', nx: 0.4, nz: 0.68, scale: 0.6, collision: true },
    { assetId: 'desert_tree_4', nx: 0.6, nz: 0.68, scale: 0.7, collision: true },
]);

/** @deprecated Use BOSS_ARENA_PLACEMENT */
export const TREE_GROVE_BOSS_ARENA = BOSS_ARENA_PLACEMENT;
