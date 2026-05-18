import {
    Container,
    Graphics,
    Sprite,
} from "pixi.js";

import {BIOME_COLORS} from "../constants.js";
import {VOID_SHAPE_7} from "../monsters.js";

/**
 * Per-renderer caches so textures are never reused across Pixi apps (new game / HMR).
 * Keys include shape fingerprint — same size/color can differ by archetype silhouette.
 * @type {WeakMap<import('pixi.js').Renderer, Map<string, import('pixi.js').Texture>>}
 */
const mobBodyTextureCacheByRenderer = new WeakMap();

function shapeTextureKey(shape) {
    if (!shape?.body?.length) return 'empty';
    const b0 = shape.body[0];
    const ex = shape.eye?.x ?? 0;
    const ey = shape.eye?.y ?? 0;
    return `${shape.body.length}_${b0.x}_${b0.y}_${ex}_${ey}`;
}

function drawVoidShape(g, pts, scale = 1, color = 'black') {
    g.clear();

    if (!pts || pts.length < 2) return;

    const fillColor = typeof color === 'number' ? color : 'black';

    g.moveTo(
        pts[0].x * scale,
        pts[0].y * scale
    );

    for (let i = 1; i < pts.length - 2; i += 3) {
        g.bezierCurveTo(
            pts[i].x * scale,
            pts[i].y * scale,

            pts[i + 1].x * scale,
            pts[i + 1].y * scale,

            pts[i + 2].x * scale,
            pts[i + 2].y * scale
        );
    }

    g.closePath();

    g.fill({
        color: fillColor,
        alpha: 1
    });
}

function getMobTexture(renderer, size, color, shape) {
    let cache = mobBodyTextureCacheByRenderer.get(renderer);
    if (!cache) {
        cache = new Map();
        mobBodyTextureCacheByRenderer.set(renderer, cache);
    }

    const key = `${size}_${color}_${shapeTextureKey(shape)}`;

    if (cache.has(key)) {
        return cache.get(key);
    }

    const g = new Graphics();

    const scale = size / 140;

    drawVoidShape(g, shape.body, scale, color);

    const texture = renderer.generateTexture({
        target: g,
        resolution: 1,
        antialias: true
    });

    cache.set(key, texture);

    g.destroy();

    return texture;
}

export function createMobEntity(
    renderer,
    biome,
    size = 1,
    colorOverride = null,
    shape = VOID_SHAPE_7
) {
    const c = new Container();
    /** Visual body only — breathing, facing, archetype lean. */
    const bodyC = new Container();
    /** HP / level — not affected by body animation. */
    const uiC = new Container();
    uiC.zIndex = 1000;

    c.sortableChildren = true;
    c.addChild(bodyC);
    c.addChild(uiC);

    bodyC.baseScaleX = 1;
    bodyC.baseScaleY = 1;

    const biomeData = BIOME_COLORS[biome] || {};

    const color =
        colorOverride ??
        biomeData.accent ??
        0xc9184a;

    // =========================
    // SHADOW
    // =========================

    const shadow = new Graphics();

    shadow
        .ellipse(0, size + 0, size + 10, 6)
        .fill({
            color: 0x000000,
            alpha: 0.15
        });

    bodyC.addChild(shadow);

    // =========================
    // BODY SPRITE
    // =========================

    const texture = getMobTexture(
        renderer,
        size,
        color,
        shape
    );

    const body = new Sprite(texture);

    // center correctly
    body.anchor.set(0.5);

    body.eventMode = 'static';

    bodyC.addChild(body);

    // =========================
    // EYE
    // =========================

    const eye = new Graphics();
    const s = Math.min(size / 13, 2); // Max size is 2

    const eyeX = shape.eye.x * s;
    const eyeY = shape.eye.y * s;

    eye.moveTo(eyeX, eyeY)
        .lineTo(eyeX - 8 * s, eyeY - 2 * s)
        .lineTo(eyeX - 6 * s, eyeY + 1 * s)
        .closePath()
        .fill(0xffffff);

    bodyC.addChild(eye);

    // =========================
    // HP BAR (world-aligned overlay)
    // =========================

    const hpBg = new Graphics();

    const barWidth = size * 2 + 6;
    const barY = -size - 14;

    hpBg
        .rect(
            -size - 3,
            barY,
            barWidth,
            5
        )
        .fill({
            color: 0x111111,
            alpha: 0.8
        });

    uiC.addChild(hpBg);

    const hpBar = new Graphics();

    hpBar
        .rect(
            -size - 2,
            barY + 1,
            size * 2 + 4,
            3
        )
        .fill(0xff4444);

    uiC.addChild(hpBar);

    c.userData = {
        size,
        barY,
        barWidth
    };

    return {
        c,
        bodyC,
        uiC,
        body,
        eye,
        shadow,
        hpBg,
        hpBar,
        shapeDef: shape,
    };
}