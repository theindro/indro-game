import { Container, Graphics } from 'pixi.js';

import { VOID_SHAPE_7 } from '../monsters.js';
import {
    computeBodyAnchor,
    drawLocalBezierShape,
    drawMobEye,
    MOB_BODY_FILL_COLOR,
    mobRenderScale,
    toLocalShapePoint,
    toLocalShapePoints,
    toPixiColor,
} from '../voidShapeLayout.js';

export function createMobEntity(
    renderer,
    biome,
    size = 1,
    colorOverride = null,
    shape = VOID_SHAPE_7
) {
    const c = new Container();
    const bodyC = new Container();
    const uiC = new Container();
    uiC.zIndex = 1000;

    c.sortableChildren = true;
    c.addChild(bodyC);
    c.addChild(uiC);

    bodyC.sortableChildren = true;
    bodyC.baseScaleX = 1;
    bodyC.baseScaleY = 1;

    const bodyFill = toPixiColor(colorOverride, MOB_BODY_FILL_COLOR);
    const scale = mobRenderScale(size);
    const anchor = computeBodyAnchor(shape.body);

    const shadow = new Graphics();
    shadow
        .ellipse(0, size + 0, size + 10, 6)
        .fill({ color: 0x000000, alpha: 0.15 });
    shadow.zIndex = 0;
    bodyC.addChild(shadow);

    const bodyGfx = new Graphics();
    drawLocalBezierShape(
        bodyGfx,
        toLocalShapePoints(shape.body, anchor, scale),
        bodyFill,
        0,
        0
    );
    bodyGfx.zIndex = 1;
    bodyGfx.eventMode = 'static';
    bodyC.addChild(bodyGfx);

    const body = bodyGfx;

    if (Array.isArray(shape.parts)) {
        for (const part of shape.parts) {
            const g = new Graphics();
            g.zIndex = 2;
            const partFill = toPixiColor(part.color, MOB_BODY_FILL_COLOR);
            if (part.type === 'bezier' && part.points?.length >= 4) {
                drawLocalBezierShape(
                    g,
                    toLocalShapePoints(part.points, anchor, scale),
                    partFill,
                    0,
                    0
                );
            } else if (part.type === 'circle') {
                const local = toLocalShapePoint(part, anchor, scale);
                g.circle(local.x, local.y, (part.r ?? 12) * scale)
                    .fill({ color: partFill, alpha: 0.9 });
            }
            bodyC.addChild(g);
        }
    }

    const eye = new Graphics();
    eye.zIndex = 5;
    drawMobEye(eye, shape, size, 0xffffff);
    bodyC.addChild(eye);

    const barWidth = size * 2 + 6;
    const barY = -size - 14;

    const hpBg = new Graphics();
    hpBg
        .rect(-size - 3, barY, barWidth, 5)
        .fill({ color: 0x111111, alpha: 0.8 });
    uiC.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar
        .rect(-size - 2, barY + 1, size * 2 + 4, 3)
        .fill(0xff4444);
    uiC.addChild(hpBar);

    c.userData = { size, barY, barWidth };

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
