import { seededRandom } from '../chunkPlacement.js';

const MIN_SEGMENTS = 12;
const MAX_SEGMENTS = 20;

/** Matches lakeRoot.scale.y in lakeRenderer — collision must use the same squash. */
export const LAKE_VISUAL_SQUASH_Y = 0.6;
export const LAKE_SMOOTH_ITERATIONS = 3;

/**
 * Chaikin corner-cutting: each edge becomes two points at 25% and 75%.
 * @param {number[]} points Flat [x0,z0, x1,z1, ...]
 * @param {number} [iterations]
 * @returns {number[]}
 */
export function smoothPolygon(points, iterations = LAKE_SMOOTH_ITERATIONS) {
    let pts = points.slice();

    for (let it = 0; it < iterations; it++) {
        const out = [];
        const n = pts.length >> 1;

        for (let i = 0; i < n; i++) {
            const ax = pts[i * 2];
            const ay = pts[i * 2 + 1];
            const bx = pts[((i + 1) % n) * 2];
            const by = pts[((i + 1) % n) * 2 + 1];
            out.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25);
            out.push(ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
        }

        pts = out;
    }

    return pts;
}

/**
 * Squash local Z to match rendered lake (container scale.y).
 * @param {number[]} shape
 * @param {number} [squashY]
 */
export function squashLakeShapeY(shape, squashY = LAKE_VISUAL_SQUASH_Y) {
    const out = new Array(shape.length);
    for (let i = 0; i < shape.length; i += 2) {
        out[i] = shape[i];
        out[i + 1] = shape[i + 1] * squashY;
    }
    return out;
}

/**
 * Smoothed + squashed outline — matches on-screen lake; use for collision and spawn checks.
 * @param {{ shape: number[] }} lake
 * @returns {number[]}
 */
export function buildLakeRenderShape(lake) {
    return squashLakeShapeY(smoothPolygon(lake.shape), LAKE_VISUAL_SQUASH_Y);
}

/**
 * Irregular lake outline in local space (center 0,0). Flat [x0,z0, x1,z1, ...].
 * @param {number} lakeSeed
 * @param {number} radiusX Width (always larger)
 * @param {number} radiusZ Height (always smaller)
 * @returns {number[]}
 */
export function buildLakeShape(lakeSeed, radiusX, radiusZ) {
    const segmentCount =
        MIN_SEGMENTS + Math.floor(seededRandom(lakeSeed + 17) * (MAX_SEGMENTS - MIN_SEGMENTS + 1));

    /** @type {number[]} */
    const shape = [];

    for (let i = 0; i < segmentCount; i++) {
        const angle = (i / segmentCount) * Math.PI * 2;
        const bump = 0.68 + seededRandom(lakeSeed + i * 97) * 0.44;
        shape.push(Math.cos(angle) * radiusX * bump, Math.sin(angle) * radiusZ * bump);
    }

    return shape;
}

/**
 * @param {number[]} shape
 * @param {number} scale
 */
export function scaleLakeShape(shape, scale) {
    const out = new Array(shape.length);
    for (let i = 0; i < shape.length; i++) {
        out[i] = shape[i] * scale;
    }
    return out;
}

/**
 * @param {number[]} shape
 */
export function getLakeShapeBounds(shape) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < shape.length; i += 2) {
        const x = shape[i];
        const z = shape[i + 1];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
    }

    return {
        minX,
        maxX,
        minZ,
        maxZ,
        cx: (minX + maxX) * 0.5,
        cz: (minZ + maxZ) * 0.5,
        width: maxX - minX,
        height: maxZ - minZ,
    };
}

/**
 * @param {number} lx
 * @param {number} lz
 * @param {number[]} shape
 */
export function pointInLakeShape(lx, lz, shape) {
    const n = shape.length >> 1;
    let inside = false;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = shape[i * 2];
        const zi = shape[i * 2 + 1];
        const xj = shape[j * 2];
        const zj = shape[j * 2 + 1];

        const intersect =
            zi > lz !== zj > lz &&
            lx < ((xj - xi) * (lz - zi)) / (zj - zi + 1e-9) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * @param {number} wx
 * @param {number} wz
 * @param {{ x: number, z: number, rotation: number }} lake
 */
export function worldToLakeLocal(wx, wz, lake) {
    const dx = wx - lake.x;
    const dz = wz - lake.z;
    const rot = lake.rotation ?? 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);

    return {
        lx: dx * cos - dz * sin,
        lz: dx * sin + dz * cos,
    };
}

/**
 * @param {number} lx
 * @param {number} lz
 * @param {{ x: number, z: number, rotation: number }} lake
 */
export function lakeLocalToWorld(lx, lz, lake) {
    const rot = lake.rotation ?? 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    return {
        x: lake.x + lx * cos - lz * sin,
        z: lake.z + lx * sin + lz * cos,
    };
}

/**
 * @param {number} lx
 * @param {number} lz
 * @param {number[]} shape
 */
export function nearestPointOnLakeBoundary(lx, lz, shape) {
    const count = shape.length >> 1;
    let bestDistSq = Infinity;
    let bestX = lx;
    let bestZ = lz;

    for (let i = 0; i < count; i++) {
        const j = (i + 1) % count;
        const x1 = shape[i * 2];
        const z1 = shape[i * 2 + 1];
        const x2 = shape[j * 2];
        const z2 = shape[j * 2 + 1];

        const edgeX = x2 - x1;
        const edgeZ = z2 - z1;
        const edgeLenSq = edgeX * edgeX + edgeZ * edgeZ || 1e-9;
        let t = ((lx - x1) * edgeX + (lz - z1) * edgeZ) / edgeLenSq;
        t = Math.max(0, Math.min(1, t));

        const px = x1 + edgeX * t;
        const pz = z1 + edgeZ * t;
        const dx = lx - px;
        const dz = lz - pz;
        const distSq = dx * dx + dz * dz;

        if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestX = px;
            bestZ = pz;
        }
    }

    return { x: bestX, z: bestZ, dist: Math.sqrt(bestDistSq) };
}

/**
 * @param {number} wx
 * @param {number} wz
 * @param {number} radius
 * @param {{ x: number, z: number, rotation: number, shape: number[] }} lake
 */
export function isCircleOverlappingLake(wx, wz, radius, lake) {
    const { lx, lz } = worldToLakeLocal(wx, wz, lake);
    if (pointInLakeShape(lx, lz, lake.shape)) return true;

    const nearest = nearestPointOnLakeBoundary(lx, lz, lake.shape);
    const dx = lx - nearest.x;
    const dz = lz - nearest.z;
    return dx * dx + dz * dz < radius * radius;
}

/**
 * @param {number} wx
 * @param {number} wz
 * @param {number} radius
 * @param {{ x: number, z: number, rotation: number, shape: number[] }} lake
 */
export function resolveCircleVsLake(wx, wz, radius, lake) {
    if (!lake?.shape?.length) return { x: wx, z: wz };

    if (!isCircleOverlappingLake(wx, wz, radius, lake)) {
        return { x: wx, z: wz };
    }

    let { lx, lz } = worldToLakeLocal(wx, wz, lake);

    for (let step = 0; step < 24; step++) {
        if (!pointInLakeShape(lx, lz, lake.shape)) {
            const nearest = nearestPointOnLakeBoundary(lx, lz, lake.shape);
            const dx = lx - nearest.x;
            const dz = lz - nearest.z;
            const dist = Math.hypot(dx, dz) || 1e-6;

            if (dist >= radius) break;

            const push = radius - dist + 0.5;
            lx += (dx / dist) * push;
            lz += (dz / dist) * push;
            break;
        }

        const nearest = nearestPointOnLakeBoundary(lx, lz, lake.shape);
        let dx = lx - nearest.x;
        let dz = lz - nearest.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.5) {
            dx = lx || 1;
            dz = lz || 0;
        }

        const len = Math.hypot(dx, dz) || 1;
        const push = radius + 1;
        lx += (dx / len) * push;
        lz += (dz / len) * push;
    }

    return lakeLocalToWorld(lx, lz, lake);
}
