import {Texture, Sprite, Container, Assets} from 'pixi.js';
import {BIOME_COLORS} from './constants.js';
// props.js — add to imports
import {emitSmoke, emitEmber} from './particles.js';

const MIN_SPAWN_RADIUS = 120;
const ALPHA_THRESHOLD = 128;
const CIRCLE_STEP = 14;   // grid spacing — lower = more accurate, more colliders
const NEARBY_THRESHOLD = 200;  // skip colliders further than this from entity (used externally)

// ─────────────────────────────
// Pixel-perfect circle packing
// ─────────────────────────────

/**
 * Reads a loaded Pixi texture, samples opaque pixels on a grid,
 * and returns an array of circle colliders in world space.
 */
async function buildPixelColliders(texture, worldX, worldY, spriteScale = 1) {
    const img = texture.source.resource; // HTMLImageElement

    const canvas = new OffscreenCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const {data} = ctx.getImageData(0, 0, w, h);

    const circles = [];
    const r = (CIRCLE_STEP / 2) * spriteScale;

    for (let py = 0; py < h; py += CIRCLE_STEP) {
        for (let px = 0; px < w; px += CIRCLE_STEP) {
            const alpha = data[(py * w + px) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                circles.push({
                    x: worldX + (px - w / 2) * spriteScale,
                    y: worldY + (py - h / 2) * spriteScale, // was (py - h)
                    r,
                });
            }
        }
    }

    return circles;
}

// ─────────────────────────────
// Spatial filter helper
// ─────────────────────────────

/**
 * Returns only colliders within NEARBY_THRESHOLD of (ex, ey).
 * Use this in resolveVsColliders calls to keep perf stable at high prop counts.
 */
export function nearbyColliders(colliders, ex, ey, threshold = NEARBY_THRESHOLD) {
    return colliders.filter(c => Math.hypot(c.x - ex, c.y - ey) < threshold + c.r);
}

// ─────────────────────────────
// Main scatter function
// ─────────────────────────────

export async function scatterProps(world, colliders, room) {
    const half = (room.size || 20) * 32;
    const biome = BIOME_COLORS[room.biome];
    const count = room.propCount || 0;
    const props = biome?.props || [];
    const result = [];

    if (!props.length) return result;

    // Preload all textures
    const textures = new Map();
    for (const p of props) {
        try {
            textures.set(p, await Assets.load(p));
        } catch (e) {
            console.warn(`Failed to load prop: ${p}`, e);
        }
    }

    let placed = 0;
    let attempts = 0;

    // replace the while loop in scatterProps:

    const placedPositions = []; // { x, y, r } of already placed props
    const MIN_PROP_GAP = 20;    // extra breathing room between prop edges

    while (placed < count && attempts < count * 25) {
        attempts++;

        const x = (Math.random() - 0.5) * half * 2;
        const y = (Math.random() - 0.5) * half * 2;

        if (Math.hypot(x, y) < MIN_SPAWN_RADIUS) continue;

        const path = props[Math.floor(Math.random() * props.length)];
        const tex = textures.get(path);
        if (!tex) continue;

        // Estimate prop footprint radius from texture size
        const propRadius = (Math.max(tex.width, tex.height) / 2);

        // Reject if too close to any already placed prop
        const tooClose = placedPositions.some(p =>
            Math.hypot(p.x - x, p.y - y) < p.r + propRadius + MIN_PROP_GAP
        );
        if (tooClose) continue;

        const container = new Container();
        container.x = x;
        container.y = y;

        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5, 0.5); // was (0.5, 1)
        container.addChild(sprite);
        world.addChild(container);

        const propCircles = await buildPixelColliders(tex, x, y, sprite.scale.x);
        for (const c of propCircles) colliders.push(c);

        placedPositions.push({x, y, r: propRadius});

        result.push({
            container,
            x,
            y,
            colliderCount: propCircles.length,
            smokeTimer: Math.random() * 30,   // stagger so they don't all puff at once
            emberTimer: Math.random() * 20,
        });

        placed++;
    }

    return result;
}