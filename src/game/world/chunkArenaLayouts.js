/**
 * Fixed arena decorations for special chunk profiles (normalized chunk coords 0–1).
 * @typedef {{ assetId: string, nx: number, nz: number, scale?: number, collision?: boolean }} ArenaPlacement
 */

/** Tree ring + stone corners + inner bushes — open center for the grove boss. */
export const TREE_GROVE_BOSS_ARENA = /** @type {ArenaPlacement[]} */ ([
    // ── Outer tree wall (N) ──
    { assetId: 'tree2', nx: 0.22, nz: 0.12, scale: 1.05, collision: false },
    { assetId: 'tree3', nx: 0.38, nz: 0.1, scale: 1.1, collision: false },
    { assetId: 'tree1', nx: 0.52, nz: 0.11, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.68, nz: 0.13, scale: 1.08, collision: false },
    { assetId: 'tree3', nx: 0.82, nz: 0.18, scale: 1.05, collision: false },
    // ── Outer tree wall (E) ──
    { assetId: 'tree1', nx: 0.88, nz: 0.32, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.9, nz: 0.48, scale: 1.12, collision: false },
    { assetId: 'tree3', nx: 0.87, nz: 0.64, scale: 1.05, collision: false },
    { assetId: 'tree1', nx: 0.84, nz: 0.78, scale: 1.0, collision: false },
    // ── Outer tree wall (S) ──
    { assetId: 'tree2', nx: 0.72, nz: 0.86, scale: 1.08, collision: false },
    { assetId: 'tree3', nx: 0.55, nz: 0.9, scale: 1.1, collision: false },
    { assetId: 'tree1', nx: 0.38, nz: 0.88, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.22, nz: 0.84, scale: 1.05, collision: false },
    // ── Outer tree wall (W) ──
    { assetId: 'tree3', nx: 0.12, nz: 0.72, scale: 1.05, collision: false },
    { assetId: 'tree1', nx: 0.1, nz: 0.52, scale: 1.0, collision: false },
    { assetId: 'tree2', nx: 0.11, nz: 0.34, scale: 1.08, collision: false },
    // ── Corner stones ──
    { assetId: 'stone4', nx: 0.18, nz: 0.2, scale: 0.75, collision: true },
    { assetId: 'stone5', nx: 0.8, nz: 0.22, scale: 0.8, collision: true },
    { assetId: 'stone6', nx: 0.78, nz: 0.76, scale: 0.78, collision: true },
    { assetId: 'stone7', nx: 0.2, nz: 0.78, scale: 0.82, collision: true },
    // ── Mid-ring bushes (gap fillers, no center) ──
    { assetId: 'bush2', nx: 0.3, nz: 0.28, scale: 0.9, collision: false },
    { assetId: 'bush3', nx: 0.7, nz: 0.3, scale: 0.85, collision: false },
    { assetId: 'bush1', nx: 0.72, nz: 0.68, scale: 0.9, collision: false },
    { assetId: 'bush2', nx: 0.28, nz: 0.7, scale: 0.88, collision: false },
    { assetId: 'bush3', nx: 0.5, nz: 0.22, scale: 0.8, collision: false },
    { assetId: 'bush1', nx: 0.5, nz: 0.78, scale: 0.82, collision: false },
    // ── Ancient trees flanking arena (visual drama) ──
    { assetId: 'tree3', nx: 0.42, nz: 0.32, scale: 1.25, collision: false },
    { assetId: 'tree2', nx: 0.58, nz: 0.32, scale: 1.2, collision: false },
    { assetId: 'tree3', nx: 0.42, nz: 0.68, scale: 1.22, collision: false },
    { assetId: 'tree2', nx: 0.58, nz: 0.68, scale: 1.18, collision: false },
]);
