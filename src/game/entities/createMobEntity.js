import {Container, Graphics} from "pixi.js";
import {BIOME_COLORS} from "../constants.js";

export function createMobEntity(biome, size = 13) {
    const c = new Container();
    const biomeData = BIOME_COLORS[biome] || {};

    const sh = new Graphics();
    sh.ellipse(0, size + 1, size, 4).fill({color: 0, alpha: 0.22});
    c.addChild(sh);

    const glCol = biomeData.glow ?? biomeData.accent ?? 0xff1654;
    const gl = new Graphics();
    gl.circle(0, 0, size + 7).fill({color: glCol, alpha: 0.15});
    c.addChild(gl);

    const body = new Graphics();
    const baseCol = biomeData.accent ?? 0xc9184a;
    const shineCol = biomeData.glow ?? 0xff6b8a;
    const detailCol = biomeData.obsidian ?? biomeData.base ?? 0x333333;

    body.circle(0, 0, size).fill(baseCol);
    body.circle(-4, -4, 5).fill({color: shineCol, alpha: 0.38});

    if (biome === 'ice') {
        body.moveTo(-5, -size - 3).lineTo(-2, -size + 5).lineTo(-8, -size + 5).closePath().fill(shineCol);
        body.moveTo(5, -size - 3).lineTo(8, -size + 5).lineTo(2, -size + 5).closePath().fill(shineCol);
    } else if (biome === 'lava') {
        const magma = biomeData.magma ?? 0xff6600;
        body.moveTo(-size + 2, 2).lineTo(-size + 8, -2).lineTo(-size + 6, 6).closePath()
            .fill({color: magma, alpha: 0.7});
        body.moveTo(4, -size + 4).lineTo(8, -size + 8).lineTo(2, -size + 8).closePath()
            .fill({color: magma, alpha: 0.7});
    } else if (biome === 'desert') {
        body.rect(size - 2, -3, 8, 5).fill(detailCol);
        body.moveTo(size + 6, -3).lineTo(size + 10, -9).lineTo(size + 8, -3).closePath()
            .fill(biomeData.glow ?? 0xff5500);
    }

    c.addChild(body);

    const eye = new Graphics();
    eye.circle(3, -3, 4).fill(0);
    eye.circle(4, -4, 2).fill(glCol);
    eye.circle(5, -5, 0.8).fill({color: 0xffffff, alpha: 0.7});
    c.addChild(eye);

    const hpBg = new Graphics();
    hpBg.rect(-size - 3, -size - 14, size * 2 + 6, 5).fill({color: 0x111111, alpha: 0.8});
    c.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-size - 2, -size - 13, size * 2 + 4, 3).fill(0xff4444);
    c.addChild(hpBar);

    return {c, body, gl, hpBar};
}
