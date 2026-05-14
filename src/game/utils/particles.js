// utils/particles.js
import { VFX } from '../GlobalEffects.js';
import { frameScale } from '../constants.js';

/**
 * Tick all particles — call once per frame with dt in seconds.
 */
export function tickParticles(dtSec = 1 / 60) {
    const particles = VFX.particles;
    const world = VFX.world;
    const fs = frameScale(dtSec);

    if (!world) return;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (!p.g || p.g.destroyed) {
            particles.splice(i, 1);
            continue;
        }

        p.g.x += p.vx * fs;
        p.g.y += p.vy * fs;
        p.vx *= Math.pow(0.9, fs);
        p.vy *= Math.pow(0.92, fs);
        p.life -= fs;
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