import { Container, Graphics } from 'pixi.js';

/**
 * Creates the player visual container and returns refs to key graphics.
 * @param {import('pixi.js').Container} world
 * @returns {{ pCont, pGlow, pBody, pRune, pShadow }}
 */
export function createPlayerEntity(world) {
    const pCont   = new Container();
    const pShadow = new Graphics();
    pShadow.ellipse(0, 15, 13, 5).fill({ color: 0, alpha: 0.28 });
    pCont.addChild(pShadow);

    const pGlow = new Graphics();
    pGlow.circle(0, 0, 22).fill({ color: 0x9b30ff, alpha: 0.18 });
    pCont.addChild(pGlow);

    const pBody = new Graphics();
    pBody.circle(0, 0, 14).fill(0x7209b7);
    pBody.circle(-4, -4, 5).fill({ color: 0xb86dff, alpha: 0.35 });
    pCont.addChild(pBody);

    const pRune = new Graphics();
    pRune.moveTo(0, -8).lineTo(5, 5).lineTo(-5, 5).closePath()
        .fill({ color: 0xe0aaff, alpha: 0.7 });
    pCont.addChild(pRune);

    world.addChild(pCont);
    return { pCont, pGlow, pBody, pRune, pShadow };
}