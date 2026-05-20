/** @typedef {{ x: number, y: number }} Point */

export const BEZIER_SEGMENT_POINT_COUNT = 3;

/** Closed bezier loop needs 1 + 3×segments points (last anchor closes to first). */
export function segmentCountFromBezierPoints(points) {
    if (!points?.length || points.length < 4) return 1;
    return Math.max(1, Math.round((points.length - 1) / BEZIER_SEGMENT_POINT_COUNT));
}

export function bezierPointCountForSegments(segments) {
    return 1 + Math.max(1, segments) * BEZIER_SEGMENT_POINT_COUNT;
}

export function isValidBezierPointCount(count) {
    return count >= 4 && (count - 1) % BEZIER_SEGMENT_POINT_COUNT === 0;
}

/**
 * Generate a voidpet-style closed bezier outline.
 * @param {number} segments
 * @param {number} [radius]
 * @returns {Point[]}
 */
export function generateBezierShape(segments = 3, radius = 140) {
    const n = Math.max(1, segments);
    const total = bezierPointCountForSegments(n);
    const pts = [];

    for (let i = 0; i < total; i++) {
        const t = (i / (total - 1)) * Math.PI * 2 - Math.PI / 2;
        const wobble = 0.82 + 0.18 * Math.cos(t * 3);
        const r = radius * wobble * (i % 3 === 1 ? 1.05 : i % 3 === 2 ? 0.95 : 1);
        pts.push({
            x: Math.cos(t) * r * (Math.abs(Math.cos(t)) < 0.2 ? 0.75 : 1),
            y: Math.sin(t) * r,
        });
    }

    pts[0] = { x: 0, y: -radius };
    pts[total - 1] = { x: pts[0].x, y: pts[0].y };
    return pts;
}

/**
 * @param {Point[]} points
 */
export function clonePoints(points) {
    return (points ?? []).map((p) => ({ x: p.x, y: p.y }));
}

/**
 * @param {import('pixi.js').Graphics} g
 * @param {Point[]} pts
 * @param {number} [fill]
 * @param {number} [stroke]
 */
export function drawBezierShape(g, pts, fill = 0x7c5cff, stroke = 0x2a1a4a) {
    g.clear();
    if (!pts || pts.length < 4) return;

    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 2; i += 3) {
        g.bezierCurveTo(
            pts[i].x, pts[i].y,
            pts[i + 1].x, pts[i + 1].y,
            pts[i + 2].x, pts[i + 2].y
        );
    }
    g.closePath();
    g.fill({ color: fill, alpha: 1 });
    g.stroke({ width: 3, color: stroke, alpha: 0.6 });
}

/**
 * @param {import('pixi.js').Graphics} g
 * @param {number} x
 * @param {number} y
 * @param {number} s
 */
export function drawEyeWedge(g, x, y, s = 1.5) {
    g.clear();
    g.moveTo(x, y)
        .lineTo(x - 8 * s, y - 2 * s)
        .lineTo(x - 6 * s, y + 1 * s)
        .closePath()
        .fill(0xffffff);
}

/**
 * Normalize legacy / editor shape into editor model.
 * @param {object} raw
 */
export function normalizeShapeDefinition(raw) {
    if (!raw) {
        return {
            body: generateBezierShape(3),
            eye: { x: 10, y: -4, size: 1 },
            parts: [],
        };
    }

    const parts = [];
    if (Array.isArray(raw.parts)) {
        for (const p of raw.parts) {
            parts.push({ ...p, points: clonePoints(p.points) });
        }
    } else if (raw.parts && typeof raw.parts === 'object') {
        for (const [id, p] of Object.entries(raw.parts)) {
            parts.push({
                id,
                label: id,
                type: p.type ?? 'bezier',
                color: p.color ?? 0xaa66ff,
                points: clonePoints(p.points),
                x: p.x,
                y: p.y,
                r: p.r ?? 20,
            });
        }
    }

    return {
        body: clonePoints(raw.body) ?? generateBezierShape(3),
        eye: {
            x: raw.eye?.x ?? 10,
            y: raw.eye?.y ?? -4,
            size: typeof raw.eye?.size === 'number' ? raw.eye.size : 1,
        },
        parts,
    };
}

/**
 * @param {ReturnType<typeof normalizeShapeDefinition>} model
 */
export function shapeModelToExport(model) {
    const out = {
        body: clonePoints(model.body),
        eye: {
            x: model.eye.x,
            y: model.eye.y,
            size: model.eye.size ?? 1,
        },
    };
    if (model.parts?.length) {
        out.parts = model.parts.map((p) => {
            const entry = {
                id: p.id,
                type: p.type,
                color: p.color,
            };
            if (p.type === 'bezier') entry.points = clonePoints(p.points);
            if (p.type === 'circle') {
                entry.x = p.x;
                entry.y = p.y;
                entry.r = p.r;
            }
            return entry;
        });
    }
    return out;
}

/**
 * @param {string} exportName
 * @param {object} shape
 */
export function formatShapeExportBlock(exportName, shape) {
    const bodyJson = JSON.stringify(shape.body);
    const lines = [
        `export const ${exportName} = {`,
        `    body: ${bodyJson},`,
        `    eye: {x: ${shape.eye.x}, y: ${shape.eye.y}, size: ${shape.eye.size ?? 1}}`,
    ];

    if (shape.parts?.length) {
        lines.push(`    parts: ${JSON.stringify(shape.parts)},`);
    }

    lines.push('};');
    return lines.join('\n');
}
