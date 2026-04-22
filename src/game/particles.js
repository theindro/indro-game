import { Graphics } from 'pixi.js';

/**
 * Emit a burst of particles at world-space (x, y).
 * @param {import('pixi.js').Container} world
 * @param {Array}  particles - mutable particle array
 * @param {number} x
 * @param {number} y
 * @param {number} color     - hex color
 * @param {number} [count=10]
 * @param {number} [maxSpd=3]
 */
export function burst(world, particles, x, y, color, count = 10, maxSpd = 3) {
    for (let i = 0; i < count; i++) {
        const p  = new Graphics();
        p.circle(0, 0, 1.5 + Math.random() * 3).fill({ color, alpha: 0.9 });
        p.x = x; p.y = y;
        const a  = Math.random() * Math.PI * 2;
        const sp = 0.8 + Math.random() * maxSpd;
        world.addChild(p);
        particles.push({
            g: p,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 25 + Math.random() * 25,
            maxLife: 50,
        });
    }
}

/**
 * Tick all particles — call once per frame.
 * @param {import('pixi.js').Container} world
 * @param {Array} particles
 */
export function tickParticles(world, particles) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.g.x += p.vx;
        p.g.y += p.vy;
        p.vx  *= 0.9;
        p.vy  *= 0.92;  // smoke drifts longer
        p.life--;
        p.g.alpha = p.life / p.maxLife;

        // smoke puffs grow as they rise
        if (p.scale) {
            const growFactor = 1 + (1 - p.life / p.maxLife) * 0.8;
            p.g.scale.set(growFactor);
        }

        if (p.life <= 0) {
            world.removeChild(p.g);
            particles.splice(i, 1);
        }
    }
}

/**
 * Spawns a single smoke puff particle drifting upward.
 */
export function emitSmoke(world, particles, x, y) {
    const size = 6 + Math.random() * 8;
    const p = new Graphics();
    p.circle(0, 0, size).fill({ color: 0x554444, alpha: 0.35 });
    p.x = x + (Math.random() - 0.5) * 14;
    p.y = y;
    world.addChild(p);

    const maxLife = 55 + Math.random() * 40;
    particles.push({
        g: p,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.5 + Math.random() * 0.8),  // drift upward
        life: maxLife,
        maxLife,
        scale: size,
    });
}

/**
 * Spawns a single ember that rises then fades.
 */
export function emitEmber(world, particles, x, y) {
    const p = new Graphics();
    p.circle(0, 0, 1.5 + Math.random() * 2).fill({ color: 0xff4400, alpha: 1 });
    p.x = x + (Math.random() - 0.5) * 20;
    p.y = y;
    world.addChild(p);

    const maxLife = 40 + Math.random() * 50;
    particles.push({
        g: p,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(1.2 + Math.random() * 1.8),
        life: maxLife,
        maxLife,
    });
}