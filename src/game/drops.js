import { Container, Graphics } from 'pixi.js';

const GOLD_COLOR  = 0xffd700;
const HEART_COLOR = 0xff2255;

function makeGoldVisual(c) {
    // Outer glow
    const gl = new Graphics();
    gl.circle(0, 0, 12).fill({ color: GOLD_COLOR, alpha: 0.2 });
    c.addChild(gl);

    // Coin body
    const coin = new Graphics();
    coin.circle(0, 0, 6).fill(GOLD_COLOR);
    coin.circle(0, 0, 4).fill({ color: 0xffe566, alpha: 1 });
    // Shine
    coin.circle(-2, -2, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
    c.addChild(coin);

    return gl;
}

function makeHeartVisual(c) {
    // Outer glow
    const gl = new Graphics();
    gl.circle(0, 0, 14).fill({ color: HEART_COLOR, alpha: 0.2 });
    c.addChild(gl);

    // Heart shape built from two circles + triangle
    const heart = new Graphics();
    // Left bump
    heart.circle(-3.5, -2, 5).fill(HEART_COLOR);
    // Right bump
    heart.circle(3.5, -2, 5).fill(HEART_COLOR);
    // Bottom triangle to make the point
    heart.moveTo(-8, 1).lineTo(8, 1).lineTo(0, 10).closePath().fill(HEART_COLOR);
    // Shine
    heart.circle(-2, -4, 1.8).fill({ color: 0xffffff, alpha: 0.5 });
    c.addChild(heart);

    return gl;
}

/**
 * Spawns drops at (x, y).
 * Every kill drops 1-3 gold coins.
 * 1/10 chance of also dropping a heart.
 */
export function spawnDrops(world, x, y, count = 1) {
    const result = [];

    for (let i = 0; i < count; i++) {
        // Always drop gold (1-3 coins per mob)
        const goldCount = 1 + Math.floor(Math.random() * 3);
        for (let g = 0; g < goldCount; g++) {
            const c = new Container();
            const gl = makeGoldVisual(c);

            const a  = Math.random() * Math.PI * 2;
            const sp = 1.5 + Math.random() * 2.5;
            c.x = x;
            c.y = y;
            world.addChild(c);

            result.push({
                c, gl,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                type: 'gold',
                bob: Math.random() * Math.PI * 2,
            });
        }

        // 1/10 chance of heart drop
        if (Math.random() < 0.1) {
            const c = new Container();
            const gl = makeHeartVisual(c);

            const a  = Math.random() * Math.PI * 2;
            const sp = 1.2 + Math.random() * 1.8;
            c.x = x;
            c.y = y;
            world.addChild(c);

            result.push({
                c, gl,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                type: 'hp',
                bob: Math.random() * Math.PI * 2,
            });
        }
    }

    return result;
}