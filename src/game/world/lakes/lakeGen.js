/**
 * Deterministic lake placement per chunk profile.
 */
import { seededRandom, chunkSeed, randInRange } from '../chunkPlacement.js';
import {
    buildLakeShape,
    buildLakeRenderShape,
    pointInLakeShape,
    worldToLakeLocal,
} from './lakeGeometry.js';

/**
 * @typedef {object} LakeDef
 * @property {number} radiusMin
 * @property {number} radiusMax
 * @property {number} count
 */

/**
 * @typedef {object} LakeInstance
 * @property {number} x World X (center)
 * @property {number} z World Z (center)
 * @property {number} radiusX Width (local X), always > radiusZ
 * @property {number} radiusZ Height (local Z), always < radiusX
 * @property {number} rotation Radians
 * @property {string} biome Visual palette key (e.g. 'water')
 * @property {number[]} shape Flat local polygon [x0,z0, x1,z1, ...]
 */

/**
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {number} worldSeed
 * @param {import('../chunkProfiles.data.js').ChunkLandscapeProfile} profile
 * @param {number} chunkSize Tiles per chunk edge
 * @param {number} tileSize Pixels per tile
 * @returns {LakeInstance[]}
 */
export function generateLakesForChunk(chunkX, chunkZ, worldSeed, profile, chunkSize, tileSize) {
    const defs = profile?.lakes;
    if (!defs?.length) return [];

    const chunkSizeWorld = chunkSize * tileSize;
    const startX = chunkX * chunkSizeWorld;
    const startZ = chunkZ * chunkSizeWorld;
    const baseSeed = chunkSeed(chunkX, chunkZ, worldSeed);

    /** @type {LakeInstance[]} */
    const lakes = [];
    let lakeIndex = 0;

    for (const def of defs) {
        const count = Math.max(0, Math.floor(def.count ?? 0));
        if (count <= 0) continue;

        for (let c = 0; c < count; c++) {
            const lakeSeed = baseSeed ^ (lakeIndex * 48611);
            lakeIndex++;

            const radiusX = randInRange(lakeSeed + 101, {
                min: def.radiusMin,
                max: def.radiusMax,
            });
            const heightRatio = 0.42 + seededRandom(lakeSeed + 202) * 0.33;
            const radiusZ = radiusX * heightRatio;
            const radiusMax = radiusX;
            const margin = radiusMax * 1.5;

            const minX = startX + margin;
            const maxX = startX + chunkSizeWorld - margin;
            const minZ = startZ + margin;
            const maxZ = startZ + chunkSizeWorld - margin;

            if (minX >= maxX || minZ >= maxZ) continue;

            const x = randInRange(lakeSeed + 303, { min: minX, max: maxX });
            const z = randInRange(lakeSeed + 404, { min: minZ, max: maxZ });
            const rotation = 0;
            const shape = buildLakeShape(lakeSeed + 606, radiusX, radiusZ);

            lakes.push({
                x,
                z,
                radiusX,
                radiusZ,
                rotation,
                biome: 'water',
                shape,
            });
        }
    }

    return lakes;
}

/**
 * @param {number} x World X
 * @param {number} z World Z
 * @param {LakeInstance[]} lakes
 */
export function isPointInLake(x, z, lakes) {
    if (!lakes?.length) return false;

    for (const lake of lakes) {
        const { lx, lz } = worldToLakeLocal(x, z, lake);
        if (pointInLakeShape(lx, lz, buildLakeRenderShape(lake))) return true;
    }

    return false;
}
