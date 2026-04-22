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
        p.g.x  += p.vx;
        p.g.y  += p.vy;
        p.vx   *= 0.9;
        p.vy   *= 0.9;
        p.life--;
        p.g.alpha = p.life / p.maxLife;
        if (p.life <= 0) {
            world.removeChild(p.g);
            particles.splice(i, 1);
        }
    }
}