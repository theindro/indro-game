import { Container, Graphics } from 'pixi.js';

/**
 * Spawns loot/xp drop orbs at (x, y).
 * @param {import('pixi.js').Container} world
 * @param {number} x
 * @param {number} y
 * @param {number} [count=1]
 * @returns {Array} drop state objects
 */
export function spawnDrops(world, x, y, count = 1) {
    const result = [];

    for (let i = 0; i < count; i++) {
        // NEW: 3rd drop type
        const roll = Math.random();
        const type =
            roll > 0.70 ? 'hp' :      // 30%
                roll > 0.35 ? 'xp' :      // 35%
                    'loot';      // 35%

        const c = new Container();

        let color;

        if (type === 'xp') color = 0xffd700;
        else if (type === 'hp') color = 0xff3366;
        else color = 0x00eeff;

        const gl = new Graphics();
        gl.circle(0, 0, 10).fill({ color, alpha: 0.2 });
        c.addChild(gl);

        const orb = new Graphics();
        orb.circle(0, 0, 5).fill(color);
        orb.circle(-1.5, -1.5, 2).fill({ color: 0xffffff, alpha: 0.5 });
        c.addChild(orb);

        const a  = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 2.5;

        c.x = x;
        c.y = y;
        world.addChild(c);

        result.push({
            c,
            gl,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            type,
            bob: Math.random() * Math.PI * 2,
        });
    }

    return result;
}