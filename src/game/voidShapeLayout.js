/**
 * Shared layout for void mob shapes — editor and in-game use the same anchor + scale.
 * Shape data in monsters.js is stored in "design space" (authored at reference size 140).
 */

/** Mob `size` in createMobEntity matches this when scale === 1. */
export const REFERENCE_MOB_SIZE = 140;

/** Eye wedge multiplier at reference size (see drawEyeWedge). */
export const EYE_WEDGE_REFERENCE_SCALE = 1.5;

/** Default mob body fill — parts use their own colors from the editor. */
export const MOB_BODY_FILL_COLOR = 0x000000;

/**
 * Anchor = center of body bounding box (matches generateTexture center for body-only sprite).
 * @param {{ x: number, y: number }[]} bodyPoints
 */
export function computeBodyAnchor(bodyPoints) {
    if (!bodyPoints?.length) {
        return { x: 0, y: 0 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of bodyPoints) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
    };
}

/** @param {number} mobSize */
export function mobRenderScale(mobSize) {
    return mobSize / REFERENCE_MOB_SIZE;
}

/**
 * Pixi fill/stroke only accepts numeric hex colors — not `''`, `'black'`, etc.
 * @param {number | string | null | undefined} value
 * @param {number} [fallback]
 */
export function toPixiColor(value, fallback = 0xffffff) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (!s) return fallback;
        if (s === 'black') return 0x000000;
        if (s === 'white') return 0xffffff;
        if (s.startsWith('#')) {
            const hex = Number.parseInt(s.slice(1), 16);
            if (Number.isFinite(hex)) return hex;
        }
        if (s.startsWith('0x')) {
            const hex = Number.parseInt(s.slice(2), 16);
            if (Number.isFinite(hex)) return hex;
        }
    }
    return fallback;
}

/**
 * @param {number | string | null | undefined} colorOverride
 * @param {number | undefined} biomeAccent
 * @param {number} [fallback]
 */
export function resolveMobColor(colorOverride, biomeAccent, fallback = 0xc9184a) {
    if (colorOverride !== null && colorOverride !== undefined && colorOverride !== '') {
        return toPixiColor(colorOverride, fallback);
    }
    if (biomeAccent !== null && biomeAccent !== undefined && biomeAccent !== '') {
        return toPixiColor(biomeAccent, fallback);
    }
    return fallback;
}

/** Visible eye size on screen (matches pre-layout formula). */
export function eyeWedgeScaleForMobSize(mobSize, eyeSizeMul = 1) {
    const mul = typeof eyeSizeMul === 'number' && eyeSizeMul > 0 ? eyeSizeMul : 1;
    return Math.min(mobSize / 13, 2) * (EYE_WEDGE_REFERENCE_SCALE / 1.5) * mul;
}

/**
 * @param {import('pixi.js').Graphics} g
 * @param {{ body: object[], eye: object }} shape
 * @param {number} mobSize
 * @param {number} [fillColor]
 */
export function drawMobEye(g, shape, mobSize, fillColor = 0xffffff) {
    if (!shape?.eye || !shape?.body?.length) return;
    const anchor = computeBodyAnchor(shape.body);
    const layoutScale = mobRenderScale(mobSize);
    const local = toLocalShapePoint(shape.eye, anchor, layoutScale);
    const eyeMul = shape.eye.size ?? 1;
    drawLocalEyeWedge(g, local.x, local.y, eyeWedgeScaleForMobSize(mobSize, eyeMul), fillColor);
}

/**
 * Design-space point → local coords centered on body anchor, scaled for mob size.
 * @param {{ x: number, y: number }} p
 * @param {{ x: number, y: number }} anchor
 * @param {number} scale
 */
export function toLocalShapePoint(p, anchor, scale) {
    return {
        x: (p.x - anchor.x) * scale,
        y: (p.y - anchor.y) * scale,
    };
}

/**
 * @param {{ x: number, y: number }[]} points
 * @param {{ x: number, y: number }} anchor
 * @param {number} scale
 */
export function toLocalShapePoints(points, anchor, scale) {
    return (points ?? []).map((p) => toLocalShapePoint(p, anchor, scale));
}

/**
 * @param {import('pixi.js').Graphics} g
 * @param {{ x: number, y: number }[]} pts
 * @param {number} [fill]
 * @param {number} [stroke]
 * @param {number} [strokeWidth]
 */
export function drawLocalBezierShape(g, pts, fill = 0x7c5cff, stroke = 0x2a1a4a, strokeWidth = 3) {
    g.clear();
    if (!pts || pts.length < 4) return;

    const fillColor = toPixiColor(fill, 0x7c5cff);
    const strokeColor = toPixiColor(stroke, 0x2a1a4a);

    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 2; i += 3) {
        g.bezierCurveTo(
            pts[i].x, pts[i].y,
            pts[i + 1].x, pts[i + 1].y,
            pts[i + 2].x, pts[i + 2].y
        );
    }
    g.closePath();
    g.fill({ color: fillColor, alpha: 1 });
    if (strokeWidth > 0) {
        g.stroke({ width: strokeWidth, color: strokeColor, alpha: 0.6 });
    }
}

/**
 * @param {import('pixi.js').Graphics} g
 * @param {number} localX
 * @param {number} localY
 * @param {number} wedgeScale
 */
export function drawLocalEyeWedge(g, localX, localY, wedgeScale = EYE_WEDGE_REFERENCE_SCALE, fillColor = 0xffffff) {
    g.clear();
    g.moveTo(localX, localY)
        .lineTo(localX - 8 * wedgeScale, localY - 2 * wedgeScale)
        .lineTo(localX - 6 * wedgeScale, localY + 1 * wedgeScale)
        .closePath()
        .fill(toPixiColor(fillColor, 0xffffff));
}
