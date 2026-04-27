// core/GlobalEffects.js
import { Graphics } from 'pixi.js';
import { showFloat } from './utils/floatText.js';

class VisualEffects {
    constructor() {
        this.floats = [];
        this.particles = [];
        this.shakeRef = { value: 0 };
        this.world = null;  // Need world reference for adding particles
        this.initialized = false;
    }

    init(world, particlesArray) {
        this.world = world;
        this.particles = particlesArray;
        this.initialized = true;
        console.log('✅ VisualEffects initialized');
    }

    // ============ FLOATING TEXT ============
    addFloat(text, x, y, color = '#ffffff') {
        showFloat(x, y, text, color);
    }

    // ============ PARTICLE EFFECTS ============

    /**
     * Emit a burst of particles
     * @param {number} x - world x position
     * @param {number} y - world y position
     * @param {number} color - hex color
     * @param {number} count - number of particles
     * @param {number} maxSpd - maximum speed
     */
    burst(x, y, color, count = 10, maxSpd = 3) {
        if (!this.initialized || !this.world) {
            console.warn('VFX not initialized or world missing');
            return;
        }

        for (let i = 0; i < count; i++) {
            const p = new Graphics();
            p.circle(0, 0, 1.5 + Math.random() * 3).fill({ color, alpha: 0.9 });
            p.x = x;
            p.y = y;
            const a = Math.random() * Math.PI * 2;
            const sp = 0.8 + Math.random() * maxSpd;
            this.world.addChild(p);
            this.particles.push({
                g: p,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 25 + Math.random() * 25,
                maxLife: 50,
            });
        }
    }

    /**
     * Spawn smoke puff
     * @param {number} x - world x position
     * @param {number} y - world y position
     */
    smoke(x, y) {
        if (!this.initialized || !this.world) return;

        const size = 6 + Math.random() * 8;
        const p = new Graphics();
        p.circle(0, 0, size).fill({ color: 0x554444, alpha: 0.35 });
        p.x = x + (Math.random() - 0.5) * 14;
        p.y = y;
        this.world.addChild(p);

        const maxLife = 55 + Math.random() * 40;
        this.particles.push({
            g: p,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -(0.5 + Math.random() * 0.8),
            life: maxLife,
            maxLife,
            scale: size,
        });
    }

    /**
     * Spawn ember particle
     * @param {number} x - world x position
     * @param {number} y - world y position
     */
    ember(x, y) {
        if (!this.initialized || !this.world) return;

        const p = new Graphics();
        p.circle(0, 0, 1.5 + Math.random() * 2).fill({ color: 0xff4400, alpha: 1 });
        p.x = x + (Math.random() - 0.5) * 20;
        p.y = y;
        this.world.addChild(p);

        const maxLife = 40 + Math.random() * 50;
        this.particles.push({
            g: p,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(1.2 + Math.random() * 1.8),
            life: maxLife,
            maxLife,
        });
    }

    /**
     * Spawn blood particles (for hits)
     * @param {number} x - world x position
     * @param {number} y - world y position
     * @param {number} count - number of blood particles
     */
    blood(x, y, count = 8) {
        this.burst(x, y, 0xaa2222, count, 4);
    }

    /**
     * Spawn spark particles
     * @param {number} x - world x position
     * @param {number} y - world y position
     * @param {number} count - number of spark particles
     */
    sparks(x, y, count = 12) {
        this.burst(x, y, 0xffaa44, count, 5);
    }

    /**
     * Spawn magic particles
     * @param {number} x - world x position
     * @param {number} y - world y position
     * @param {number} color - hex color
     * @param {number} count - number of particles
     */
    magic(x, y, color = 0x8844ff, count = 15) {
        this.burst(x, y, color, count, 2.5);
    }

    // ============ SCREEN SHAKE ============
    shake(intensity = 5) {
        this.shakeRef.value = intensity;
    }

    // ============ CLEANUP ============
    clear() {
        if (this.floats) {
            for (const f of this.floats) {
                if (f.el) f.el.remove();
            }
            this.floats.length = 0;
        }

        if (this.particles && this.world) {
            for (const p of this.particles) {
                if (p.g && !p.g.destroyed) {
                    this.world.removeChild(p.g);
                    p.g.destroy();
                }
            }
            this.particles.length = 0;
        }

        this.shakeRef.value = 0;
    }
}

export const VFX = new VisualEffects();