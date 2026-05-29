/**
 * Tight prop collision outlines from texture alpha (cached per asset id / texture).
 * Local shape: flat [x0,y0, x1,y1, ...] with (0,0) at the sprite foot (anchor 0.5, 1).
 */

import { assetRegistry } from '../assets/assetRegistry.js';
import { getLakeShapeBounds } from './lakes/lakeGeometry.js';

/** @type {Map<number, number[] | null>} */
const footprintCacheByTextureUid = new Map();

/** @type {Map<string, number[] | null>} */
const footprintCacheByAssetId = new Map();

const GRID_MAX = 56;
const ALPHA_THRESHOLD = 48;
const MAX_VERTS = 12;

/**
 * @param {CanvasImageSource} img
 * @param {number} texW
 * @param {number} texH
 * @param {number} anchorX
 * @param {number} anchorY
 * @returns {number[] | null}
 */
function buildFootprintFromImage(img, texW, texH, anchorX, anchorY) {
    const scale = GRID_MAX / Math.max(texW, texH, 1);
    const gw = Math.max(8, Math.ceil(texW * scale));
    const gh = Math.max(8, Math.ceil(texH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = gw;
    canvas.height = gh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.clearRect(0, 0, gw, gh);
    ctx.drawImage(img, 0, 0, gw, gh);
    const data = ctx.getImageData(0, 0, gw, gh).data;

    const pxToLocalX = texW / gw;
    const pxToLocalY = texH / gh;

    /** @type {{ x: number, y: number }[]} */
    const samples = [];

    for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
            const i = (gy * gw + gx) * 4;
            if (data[i + 3] < ALPHA_THRESHOLD) continue;

            const onEdge =
                gx === 0 ||
                gy === 0 ||
                gx === gw - 1 ||
                gy === gh - 1 ||
                data[((gy - 1) * gw + gx) * 4 + 3] < ALPHA_THRESHOLD ||
                data[((gy + 1) * gw + gx) * 4 + 3] < ALPHA_THRESHOLD ||
                data[(gy * gw + (gx - 1)) * 4 + 3] < ALPHA_THRESHOLD ||
                data[(gy * gw + (gx + 1)) * 4 + 3] < ALPHA_THRESHOLD;

            if (!onEdge) continue;

            samples.push({
                x: gx * pxToLocalX - anchorX * texW,
                y: gy * pxToLocalY - anchorY * texH,
            });
        }
    }

    if (samples.length < 4) {
        /** Fallback: all opaque pixels hull */
        for (let gy = 0; gy < gh; gy++) {
            for (let gx = 0; gx < gw; gx++) {
                const i = (gy * gw + gx) * 4;
                if (data[i + 3] >= ALPHA_THRESHOLD) {
                    samples.push({
                        x: gx * pxToLocalX - anchorX * texW,
                        y: gy * pxToLocalY - anchorY * texH,
                    });
                }
            }
        }
    }

    if (samples.length < 4) return null;

    const hull = simplifyHullByAngle(convexHull(samples), MAX_VERTS);
    if (hull.length < 3) return null;

    const flat = [];
    for (const p of hull) {
        flat.push(p.x, p.y);
    }
    return flat;
}

/**
 * @param {{ x: number, y: number }[]} points
 */
function convexHull(points) {
    if (points.length < 3) return points.slice();

    const sorted = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

function simplifyHullByAngle(hull, maxVerts) {
    if (hull.length <= maxVerts) return hull;

    let cx = 0;
    let cy = 0;
    for (const p of hull) {
        cx += p.x;
        cy += p.y;
    }
    cx /= hull.length;
    cy /= hull.length;

    const sorted = hull
        .map((p) => ({ p, a: Math.atan2(p.y - cy, p.x - cx) }))
        .sort((a, b) => a.a - b.a)
        .map((e) => e.p);

    const out = [];
    const step = sorted.length / maxVerts;
    for (let i = 0; i < maxVerts; i++) {
        out.push(sorted[Math.min(sorted.length - 1, Math.floor(i * step))]);
    }
    return out;
}

/**
 * @param {import('pixi.js').Texture} texture
 * @returns {CanvasImageSource | null}
 */
function getTextureImageSource(texture) {
    const source = texture?.source;
    if (!source) return null;

    const res = source.resource;
    if (
        res instanceof HTMLImageElement ||
        res instanceof HTMLCanvasElement ||
        res instanceof ImageBitmap
    ) {
        return res;
    }
    if (
        res?.source instanceof HTMLImageElement ||
        res?.source instanceof HTMLCanvasElement
    ) {
        return res.source;
    }
    return null;
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageElement(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
    });
}

/**
 * @param {string} assetId
 * @param {string} url
 */
async function bakeFootprintFromUrl(assetId, url) {
    if (!url || footprintCacheByAssetId.has(assetId)) return;

    try {
        const img = await loadImageElement(url);
        const shape = buildFootprintFromImage(img, img.naturalWidth || img.width, img.naturalHeight || img.height, 0.5, 1);
        footprintCacheByAssetId.set(assetId, shape);
    } catch (err) {
        console.warn(`[propFootprint] Could not bake footprint for ${assetId}:`, err);
        footprintCacheByAssetId.set(assetId, null);
    }
}

/**
 * Call once after textures load — Pixi v8 sources are not always readable via canvas later.
 */
export async function prewarmPropFootprints() {
    const tasks = [];
    const seenUrls = new Set();

    for (const entry of assetRegistry.getAllEntries()) {
        if (!entry.url || entry.kind === 'external') continue;
        if (seenUrls.has(entry.url)) continue;
        seenUrls.add(entry.url);

        const alias = entry.meta?.alias ?? entry.id;
        const base = entry.sourcePath?.split('/').pop()?.replace(/\.[^.]+$/i, '') ?? alias;

        tasks.push(bakeFootprintFromUrl(alias, entry.url));
        if (base && base !== alias) {
            tasks.push(bakeFootprintFromUrl(base, entry.url));
        }
    }

    const propContent = assetRegistry.getContentBySchema('prop');
    for (const def of Object.values(propContent)) {
        const variants = /** @type {{ variants?: string[] }} */ (def).variants;
        if (!variants?.length) continue;
        for (const variantId of variants) {
            const tex = assetRegistry.getTexture(variantId);
            if (tex) {
                getPropFootprintShape(tex, 0.5, 1, variantId);
            }
            const entry = assetRegistry.getEntry(variantId);
            if (entry?.url) {
                tasks.push(bakeFootprintFromUrl(variantId, entry.url));
            }
        }
    }

    await Promise.all(tasks);

    const ok = [...footprintCacheByAssetId.values()].filter((s) => s?.length >= 6).length;
    if (import.meta.env.DEV) {
        console.log(`[propFootprint] Baked ${ok} prop footprint(s)`);
    }
}

/**
 * @param {import('pixi.js').Texture} texture
 * @param {number} anchorX
 * @param {number} anchorY
 * @param {string} [assetId]
 * @returns {number[] | null}
 */
export function getPropFootprintShape(texture, anchorX = 0.5, anchorY = 1, assetId) {
    if (assetId && footprintCacheByAssetId.has(assetId)) {
        return footprintCacheByAssetId.get(assetId);
    }

    if (!texture?.source) return null;

    const cacheKey = texture.source.uid ?? texture.uid;
    if (footprintCacheByTextureUid.has(cacheKey)) {
        return footprintCacheByTextureUid.get(cacheKey);
    }

    const img = getTextureImageSource(texture);
    if (!img) {
        footprintCacheByTextureUid.set(cacheKey, null);
        return null;
    }

    const texW = texture.width || img.width || 1;
    const texH = texture.height || img.height || 1;
    const shape = buildFootprintFromImage(img, texW, texH, anchorX, anchorY);
    footprintCacheByTextureUid.set(cacheKey, shape);

    if (assetId && shape) {
        footprintCacheByAssetId.set(assetId, shape);
    }

    return shape;
}

export function scaleFootprintShape(shape, scale) {
    if (!shape?.length || scale === 1) return shape;
    const out = new Array(shape.length);
    for (let i = 0; i < shape.length; i++) {
        out[i] = shape[i] * scale;
    }
    return out;
}

export function getFootprintBounds(shape) {
    return getLakeShapeBounds(shape);
}
