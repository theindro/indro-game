/**
 * Seeded prop / interactable position sampling per chunk layout.
 */

/** Center loot + perimeter props + guarded mob packs (all biomes). */
export const RESOURCE_YARD_LAYOUTS = new Set([
    'lumberyard',
    'forest_mine',
    'desert_quarry',
    'desert_scrap_yard',
    'ice_crystal_mine',
    'ice_frozen_depot',
    'lava_magma_quarry',
    'lava_ash_depot',
]);

/**
 * @param {number} seed
 */
export function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * @param {number} seed
 * @param {{ min: number, max: number }} range
 */
export function randInRange(seed, range) {
    if (!range) return 0;
    const t = seededRandom(seed);
    return range.min + t * (range.max - range.min);
}

/**
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {number} worldSeed
 */
export function chunkSeed(chunkX, chunkZ, worldSeed) {
    return worldSeed ^ (chunkX * 73856093) ^ (chunkZ * 19349663);
}

/**
 * Precompute anchors shared by props, interactables, and mob packs.
 *
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {number} worldSeed
 * @param {number} chunkSizeWorld
 */
export function computeLayoutAnchors(profile, chunkX, chunkZ, worldSeed, chunkSizeWorld) {
    const startX = chunkX * chunkSizeWorld;
    const startZ = chunkZ * chunkSizeWorld;
    const baseSeed = chunkSeed(chunkX, chunkZ, worldSeed);
    const margin = chunkSizeWorld * 0.1;
    const inner = chunkSizeWorld - margin * 2;
    const half = chunkSizeWorld * 0.5;
    const layout = profile.layout ?? 'sparse';

    /** @type {{ type: string, centers?: {x:number,z:number}[], corner?: number, inset?: number }} */
    const anchors = { type: layout };

    const clusterLayouts = new Set(['clusters', 'ancient_grove', 'stone_field']);
    if (clusterLayouts.has(layout)) {
        const countRange = profile.clusterCount ?? { min: 2, max: 4 };
        const count = Math.round(randInRange(baseSeed + 101, countRange));
        const centers = [];
        for (let i = 0; i < count; i++) {
            centers.push({
                x: startX + margin + seededRandom(baseSeed + i * 17 + 3) * inner,
                z: startZ + margin + seededRandom(baseSeed + i * 23 + 7) * inner,
            });
        }
        anchors.centers = centers;
        anchors.clusterRadius = randInRange(
            baseSeed + 202,
            profile.clusterRadius ?? { min: 80, max: 150 }
        );
    }

    if (layout === 'wet_corner') {
        anchors.corner = Math.floor(seededRandom(baseSeed + 303) * 4);
    }

    if (layout === 'perimeter_ring') {
        anchors.inset = 0.12;
    }

    if (layout === 'clearing') {
        anchors.clearingRadius = chunkSizeWorld * 0.28;
    }

    if (layout === 'boss_arena') {
        anchors.arenaCenterX = startX + chunkSizeWorld * 0.5;
        anchors.arenaCenterZ = startZ + chunkSizeWorld * 0.5;
        anchors.clearRadius = chunkSizeWorld * 0.22;
    }

    const yardLayouts = RESOURCE_YARD_LAYOUTS;
    if (yardLayouts.has(layout)) {
        anchors.centerX = startX + chunkSizeWorld * 0.5;
        anchors.centerZ = startZ + chunkSizeWorld * 0.5;
        anchors.innerRadius = half * 0.34;
        anchors.perimeterMin = half * 0.52;
        anchors.perimeterMax = half * 0.9;
    }

    anchors.startX = startX;
    anchors.startZ = startZ;
    anchors.chunkSizeWorld = chunkSizeWorld;
    anchors.baseSeed = baseSeed;

    return anchors;
}

/**
 * @param {ReturnType<typeof computeLayoutAnchors>} anchors
 * @param {string} propTypeKey
 * @param {number} attemptSeed
 */
export function samplePropPosition(anchors, propTypeKey, attemptSeed) {
    const {
        startX,
        startZ,
        chunkSizeWorld,
        type,
        centers,
        clusterRadius,
        corner,
        clearingRadius,
        centerX,
        centerZ,
        innerRadius,
        perimeterMin,
        perimeterMax,
    } = anchors;

    const cx = centerX ?? startX + chunkSizeWorld * 0.5;
    const cz = centerZ ?? startZ + chunkSizeWorld * 0.5;
    const half = chunkSizeWorld * 0.5;
    const margin = chunkSizeWorld * 0.08;

    if (RESOURCE_YARD_LAYOUTS.has(type)) {
        const angle = seededRandom(attemptSeed + 40) * Math.PI * 2;
        const t = perimeterMin ?? half * 0.52;
        const tMax = perimeterMax ?? half * 0.9;
        const r = t + seededRandom(attemptSeed + 41) * (tMax - t);
        return { x: cx + Math.cos(angle) * r, z: cz + Math.sin(angle) * r };
    }

    if (type === 'stone_field' && propTypeKey === 'STONE' && centers?.length) {
        const c = centers[Math.floor(seededRandom(attemptSeed) * centers.length)];
        const angle = seededRandom(attemptSeed + 1) * Math.PI * 2;
        const dist = seededRandom(attemptSeed + 2) * (clusterRadius ?? 90) * 0.85;
        return { x: c.x + Math.cos(angle) * dist, z: c.z + Math.sin(angle) * dist };
    }

    if ((type === 'clusters' || type === 'ancient_grove') && centers?.length) {
        const c = centers[Math.floor(seededRandom(attemptSeed + 5) * centers.length)];
        const angle = seededRandom(attemptSeed + 6) * Math.PI * 2;
        const dist = seededRandom(attemptSeed + 7) * (clusterRadius ?? 120);
        return { x: c.x + Math.cos(angle) * dist, z: c.z + Math.sin(angle) * dist };
    }

    if (type === 'perimeter_ring') {
        const angle = seededRandom(attemptSeed + 10) * Math.PI * 2;
        const t = 0.62 + seededRandom(attemptSeed + 11) * 0.32;
        const r = half * t;
        return { x: cx + Math.cos(angle) * r, z: cz + Math.sin(angle) * r };
    }

    if (type === 'clearing') {
        const angle = seededRandom(attemptSeed + 12) * Math.PI * 2;
        const minR = clearingRadius ?? half * 0.35;
        const r = minR + seededRandom(attemptSeed + 13) * (half - minR - margin);
        return { x: cx + Math.cos(angle) * r, z: cz + Math.sin(angle) * r };
    }

    if (type === 'wet_corner') {
        const q = corner ?? 0;
        const qx = q % 2 === 0 ? 0 : 1;
        const qz = q < 2 ? 0 : 1;
        const wx = startX + (qx * 0.55 + seededRandom(attemptSeed + 20) * 0.4) * chunkSizeWorld;
        const wz = startZ + (qz * 0.55 + seededRandom(attemptSeed + 21) * 0.4) * chunkSizeWorld;
        return { x: wx, z: wz };
    }

    // sparse / default — uniform with margin
    return {
        x: startX + margin + seededRandom(attemptSeed + 30) * (chunkSizeWorld - margin * 2),
        z: startZ + margin + seededRandom(attemptSeed + 31) * (chunkSizeWorld - margin * 2),
    };
}

/**
 * Interactables hug groves / clearings instead of pure noise.
 *
 * @param {ReturnType<typeof computeLayoutAnchors>} anchors
 * @param {number} attemptSeed
 */
export function sampleInteractablePosition(anchors, attemptSeed) {
    const layout = anchors.type;

    if (RESOURCE_YARD_LAYOUTS.has(layout)) {
        const cx = anchors.centerX ?? anchors.startX + anchors.chunkSizeWorld * 0.5;
        const cz = anchors.centerZ ?? anchors.startZ + anchors.chunkSizeWorld * 0.5;
        const inner = anchors.innerRadius ?? anchors.chunkSizeWorld * 0.17;
        const angle = seededRandom(attemptSeed + 50) * Math.PI * 2;
        const dist = seededRandom(attemptSeed + 51) * inner * 0.92;
        return { x: cx + Math.cos(angle) * dist, z: cz + Math.sin(angle) * dist };
    }

    if (layout === 'perimeter_ring' || layout === 'clearing') {
        return samplePropPosition(anchors, 'BUSH', attemptSeed + 4000);
    }
    if ((layout === 'clusters' || layout === 'ancient_grove' || layout === 'wet_corner') && anchors.centers?.length) {
        return samplePropPosition(anchors, 'TREE', attemptSeed + 5000);
    }
    return samplePropPosition(anchors, 'BUSH', attemptSeed + 6000);
}

/**
 * Mob pack center — near a cluster in dense chunks, else random.
 *
 * @param {ReturnType<typeof computeLayoutAnchors>} anchors
 * @param {number} packIndex
 * @param {number} seed
 */
export function sampleMobPackCenter(anchors, packIndex, seed) {
    if (RESOURCE_YARD_LAYOUTS.has(anchors.type)) {
        const cx = anchors.centerX ?? anchors.startX + anchors.chunkSizeWorld * 0.5;
        const cz = anchors.centerZ ?? anchors.startZ + anchors.chunkSizeWorld * 0.5;
        const jitter = 35 + seededRandom(seed + packIndex * 91) * 95;
        const angle = seededRandom(seed + packIndex * 103) * Math.PI * 2;
        return {
            x: cx + Math.cos(angle) * jitter,
            z: cz + Math.sin(angle) * jitter,
        };
    }

    if (anchors.centers?.length && seededRandom(seed + packIndex * 91) > 0.25) {
        const c = anchors.centers[packIndex % anchors.centers.length];
        const jitter = 40 + seededRandom(seed + packIndex * 97) * 80;
        const angle = seededRandom(seed + packIndex * 103) * Math.PI * 2;
        return {
            x: c.x + Math.cos(angle) * jitter,
            z: c.z + Math.sin(angle) * jitter,
        };
    }
    const { startX, startZ, chunkSizeWorld } = anchors;
    const margin = chunkSizeWorld * 0.15;
    return {
        x: startX + margin + seededRandom(seed + packIndex * 107) * (chunkSizeWorld - margin * 2),
        z: startZ + margin + seededRandom(seed + packIndex * 109) * (chunkSizeWorld - margin * 2),
    };
}
