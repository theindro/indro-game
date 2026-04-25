import {Container, Graphics} from "pixi.js";

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

    // 🔴 HP BAR BACKGROUND
    const hpBg = new Graphics();
    hpBg.rect(-20, -32, 40, 6).fill({ color: 0x000000, alpha: 0.7 });
    pCont.addChild(hpBg);

    // 🔴 HP BAR FILL
    const hpBar = new Graphics();
    hpBar.rect(-19, -31, 38, 4).fill(0x44ff88);
    pCont.addChild(hpBar);

    return { pCont, pGlow, pBody, pRune, pShadow, hpBar };
}
