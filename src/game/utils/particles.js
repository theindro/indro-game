// utils/particles.js
import { VFX } from '../GlobalEffects.js';

/**
 * Tick all particles — call once per frame.
 * Uses global VFX.particles array
 */
export function tickParticles() {
    const particles = VFX.particles;
    const world = VFX.world;

    if (!world) return;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (!p.g || p.g.destroyed) {
            particles.splice(i, 1);
            continue;
        }

        p.g.x += p.vx;
        p.g.y += p.vy;
        p.vx *= 0.9;
        p.vy *= 0.92;
        p.life--;
        p.g.alpha = p.life / p.maxLife;

        // Handle scaling particles
        if (p.scale) {
            const growFactor = 1 + (1 - p.life / p.maxLife) * 0.8;
            p.g.scale.set(growFactor);
        }

        if (p.life <= 0) {
            if (p.g.parent) world.removeChild(p.g);
            p.g.destroy();
            particles.splice(i, 1);
        }
    }
}