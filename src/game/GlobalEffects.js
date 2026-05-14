// core/GlobalEffects.js
import {AnimatedSprite, Graphics, Sprite} from 'pixi.js';
import { showFloat } from './utils/floatText.js';
import { assetManager } from './utils/assetManager.js';

class VisualEffects {
    constructor() {
        this.floats = [];
        this.particles = [];
        this.shakeRef = { value: 0 };
        this.entityLayer = null;  // Need world reference for adding particles
        this.world = null;  // Need world reference for adding particles
        this.initialized = false;
        this.vfxLayer = null;
        this.attached = [];
    }

    init(world, particlesArray, entityLayer, vfxLayer) {
        this.world = world;
        this.particles = particlesArray;
        this.initialized = true;
        this.entityLayer = entityLayer;
        this.vfxLayer = vfxLayer;
        this.vfxLayer.zIndex = 1200
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
    burst(x, y, color = 0xffffff) {
        if (!this.initialized || !this.entityLayer) return;

        const texture = assetManager.getTexture('burst');

        if (!texture) return;

        // 🔥 IMPORTANT: adjust based on your spritesheet
        const frames = assetManager.getAnimationFrames('burst', 1024,  1024,  4,   4);
        const anim = new AnimatedSprite(frames);

        anim.anchor.set(0.5);
        anim.x = x;
        anim.y = y;

        anim.zIndex = y;

        anim.tint = color;
        if (color !== 'black') {
            anim.blendMode = 'add';
        }

        anim.animationSpeed = 0.6;
        anim.loop = false;

        // ✨ optional polish
        anim.rotation = Math.random() * Math.PI * 2;
        anim.scale.set(0.1);

        anim.onComplete = () => {
            this.entityLayer.removeChild(anim);
            anim.destroy();
        };

        this.entityLayer.addChild(anim);
        anim.play();
    }
    /**
     * Spawn smoke puff
     * @param {number} x - world x position
     * @param {number} y - world y position
     */
    smoke(x, y) {
        if (!this.initialized || !this.entityLayer) return;

        const size = 6 + Math.random() * 8;
        const p = new Graphics();
        p.circle(0, 0, size).fill({ color: 0x554444, alpha: 0.35 });
        p.x = x + (Math.random() - 0.5) * 14;
        p.y = y;
        this.entityLayer.addChild(p);

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

    removeAttached(sprite) {
        const idx = this.attached.indexOf(sprite);
        if (idx !== -1) this.attached.splice(idx, 1);
        if (sprite.parent) sprite.parent.removeChild(sprite);
        sprite.destroy();
    }

    attachVFX(target, sprite, offsetX = 0, offsetY = 0) {
        if (!this.vfxLayer) return;

        sprite.anchor.set(0.5);
        sprite.blendMode = 'add';

        sprite._target = target;
        sprite._ox = offsetX;
        sprite._oy = offsetY;

        this.vfxLayer.addChild(sprite);

        this.attached.push(sprite);

        return sprite;
    }

    updateAttachments() {
        for (let i = this.attached.length - 1; i >= 0; i--) {
            const s = this.attached[i];

            if (!s._target || s._target.destroyed) {
                this.vfxLayer.removeChild(s);
                s.destroy();
                this.attached.splice(i, 1);
                continue;
            }

            s.x = s._target.x + s._ox;
            s.y = s._target.y + s._oy;
        }
    }

    /**
     * Spawn ember particle
     * @param {number} x - world x position
     * @param {number} y - world y position
     */
    ember(x, y) {
        if (!this.initialized || !this.entityLayer) return;

        const p = new Graphics();
        p.circle(0, 0, 1.5 + Math.random() * 2).fill({ color: 0xff4400, alpha: 1 });
        p.x = x + (Math.random() - 0.5) * 20;
        p.y = y;
        this.entityLayer.addChild(p);

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

    explosion(x, y, color = null, scale = 1, size) {
        if (!this.initialized || !this.entityLayer) return;

        // Get cached frames (8x8 grid with 256px frames)
        //const frames = assetManager.getAnimationFrames('explosion', 256, 256, 8, 8);
        const frames = assetManager.getAnimationFrames('explosion_v2', 400, 288, 5, 2);

        if (!frames || frames.length === 0) {
            console.warn('Failed to get explosion animation frames');
            return;
        }

        console.log(`💥 Playing explosion with ${frames.length} frames at (${x}, ${y})`);

        const anim = new AnimatedSprite(frames);
        anim.anchor.set(0.5);
        anim.x = x;
        anim.y = y;

        // Apply color tint if provided
        if (color) {
            anim.tint = color;
        }

        // Shadow
        const shadow = new Graphics();

        shadow
            .ellipse(0, size + 0, size + 10, 6)
            .fill({
                color: 0x000000,
                alpha: 0.15
            });

        shadow.x = x;
        shadow.y = y;

        anim.zIndex = y;
        shadow.zIndex = y - 1;

        this.entityLayer.addChild(shadow);

        //anim.blendMode = 'add'; // or 'normal' for less intense
        anim.animationSpeed = 0.35; // Slower for explosion (adjust as needed)
        anim.loop = false;
        //anim.rotation = Math.random() * Math.PI * 2; // Random rotation
        anim.scale.set(scale);


        anim.onComplete = () => {
            if (this.entityLayer && !this.entityLayer.destroyed) {
                this.entityLayer.removeChild(anim);
                this.entityLayer.removeChild(shadow);
            }

            shadow.destroy();
            anim.destroy();
        };

        this.entityLayer.addChild(anim);
        anim.play();
    }


    // ============ CLEANUP ============
    clear() {
        if (this.floats) {
            for (const f of this.floats) {
                if (f.el) f.el.remove();
            }
            this.floats.length = 0;
        }

        if (this.particles && this.entityLayer) {
            for (const p of this.particles) {
                if (p.g && !p.g.destroyed) {
                    this.entityLayer.removeChild(p.g);
                    p.g.destroy();
                }
            }
            this.particles.length = 0;
        }

        this.shakeRef.value = 0;
    }

    addGlow(x, y, options = {}, target = null) {
        if (!this.initialized || !this.vfxLayer) return;

        const texture = assetManager.getTexture(options.texture || 'glow2');
        if (!texture) return;

        const glow = new Sprite(texture);

        glow.anchor.set(0.5);
        glow.blendMode = 'add';
        glow.tint = options.color ?? 0xffffff;
        glow.alpha = options.alpha ?? 0.25;

        const scale = options.scale ?? 1.5;
        glow.scale.set(scale);

        glow._baseScale = scale;
        glow._baseAlpha = options.alpha ?? 0.25;
        glow._time = Math.random() * 10;

        // 🧠 NEW: if target exists → attach mode
        if (target) {
            glow._target = target;
            glow._ox = x;
            glow._oy = y;

            this.vfxLayer.addChild(glow);
            this.attached.push(glow);

            return glow;
        }

        // fallback static glow
        glow.x = x;
        glow.y = y;
        this.vfxLayer.addChild(glow);

        return glow;
    }

    updateGlow(delta) {
        const pulseChild = (child) => {
            if (!child?._baseScale) return;
            child._time = (child._time ?? 0) + delta * 0.01;
            const pulse = 1 + Math.sin(child._time) * 0.08;
            child.scale.set(child._baseScale * pulse);
            child.alpha = Math.min(1, (child._baseAlpha ?? 0.3) + Math.sin(child._time) * 0.05);
        };

        if (this.entityLayer) {
            for (const child of this.entityLayer.children) {
                pulseChild(child);
            }
        }
        if (this.vfxLayer) {
            for (const child of this.vfxLayer.children) {
                pulseChild(child);
            }
        }
    }
}


export const VFX = new VisualEffects();