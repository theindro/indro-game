import {
    Container,
    Graphics,
    Sprite,
    RenderTexture
} from "pixi.js";

import {BIOME_COLORS} from "../constants.js";
import {VOID_SHAPE, VOID_SHAPE_3, VOID_SHAPE_7} from "../monsters.js";

// texture cache
const textureCache = new Map();

function drawVoidShape(g, pts, scale = 1, color = 0x7c5cff) {
    g.clear();

    color = "rgba(0,0,0,1)"

    if (!pts || pts.length < 2) return;

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
        color,
        alpha: 1
    });
}

function getMobTexture(renderer, size, color, shape) {
    const key = `${size}_${color}`;

    if (textureCache.has(key)) {
        return textureCache.get(key);
    }

    const g = new Graphics();

    const scale = size / 140;

    drawVoidShape(g, shape.body, scale, color);

    // IMPORTANT
    // generate texture ONCE
    const texture = renderer.generateTexture({
        target: g,
        resolution: 1,
        antialias: true
    });

    textureCache.set(key, texture);

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

    c.baseScaleX = 1;
    c.baseScaleY = 1;

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

    c.addChild(shadow);

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

    c.addChild(body);

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

    c.addChild(eye);

    // =========================
    // HP BAR
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

    c.addChild(hpBg);

    const hpBar = new Graphics();

    hpBar
        .rect(
            -size - 2,
            barY + 1,
            size * 2 + 4,
            3
        )
        .fill(0xff4444);

    c.addChild(hpBar);

    c.userData = {
        size,
        barY,
        barWidth
    };

    return {
        c,
        body,
        hpBar
    };
}