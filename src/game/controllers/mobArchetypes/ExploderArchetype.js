import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../stores/gameStore.js';

export class ExploderArchetype {
    constructor(mob, ctx) {
        this.mob = mob;
        this.exploded = false;
        this.explosionRadius = 75;
        this.explosionDamage = 20;
        this.explodeDistance = 45; // Distance to trigger explosion
        this.priming = false;
        this.primeTimer = 0;
        this.primeDuration = 30; // 0.5 seconds

        console.log('💣 EXPLODER CREATED');
    }

    update(ctx) {
        const { px, py, shakeRef, floats, openWorld } = ctx;
        const m = this.mob;

        // Already exploded? do nothing
        if (this.exploded) {
            return { moveX: 0, moveY: 0, attackOverride: true };
        }

        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        // Check if should explode (near player OR dead)
        const shouldExplode = distToPlayer < this.explodeDistance || m.hp <= 0;

        if (shouldExplode && !this.priming) {
            console.log('💣 EXPLODER TRIGGERED - Distance:', distToPlayer, 'HP:', m.hp);
            this.startExplosion(ctx);
            return { moveX: 0, moveY: 0, attackOverride: true };
        }

        // Handle priming (wait before exploding)
        if (this.priming) {
            this.primeTimer--;

            // Visual warning - flash red
            if (this.primeTimer % 6 < 3) {
                if (m.body) m.body.tint = 0xff0000;
            } else {
                if (m.body && m.body.tint === 0xff0000) m.body.tint = 0xffffff;
            }

            // Scale pulse
            const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.15;
            m.c.scale.set(pulse, pulse);

            // Create warning ring every few frames
            if (this.primeTimer % 10 === 0 && openWorld) {
                this.createWarningRing(ctx);
            }

            // Explode when timer ends
            if (this.primeTimer <= 0) {
                this.doExplosion(ctx);
            }

            return { moveX: 0, moveY: 0, attackOverride: true };
        }

        // Normal movement - chase player
        let moveX = 0, moveY = 0;
        if (distToPlayer > 20) {
            moveX = ((px - m.x) / distToPlayer) * m.speed * 1.3;
            moveY = ((py - m.y) / distToPlayer) * m.speed * 1.3;
        }

        return { moveX, moveY, attackOverride: false };
    }

    startExplosion(ctx) {
        if (this.priming || this.exploded) return;

        this.priming = true;
        this.primeTimer = this.primeDuration;

        // Show warning text
        if (ctx.floats) {
            ctx.floats.push({
                text: '💥 !!! 💥',
                x: this.mob.x,
                y: this.mob.y - 40,
                life: 25
            });
        }

        // Play warning sound effect if available
        if (window.audioManager) {
            // window.audioManager.playSFX('/sounds/warning.ogg', 0.3);
        }
    }

    doExplosion(ctx) {
        if (this.exploded) return;
        this.exploded = true;

        console.log('💥 EXPLOSION!');

        const { shakeRef, floats, openWorld } = ctx;
        const m = this.mob;

        // Screen shake
        if (shakeRef) shakeRef.value = 12;

        // Create explosion visuals
        this.createExplosionVisuals(ctx);

        // Damage player if in range
        const { px, py } = ctx;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        if (distToPlayer < this.explosionRadius) {
            const distanceFactor = 1 - (distToPlayer / this.explosionRadius);
            const damage = Math.floor(this.explosionDamage * (0.5 + distanceFactor * 0.5));

            console.log('💥 Player damaged:', damage);
            useGameStore.getState().damagePlayer(damage, 'explosion');

            if (floats) {
                floats.push({
                    text: `💥 ${damage}!`,
                    x: m.x,
                    y: m.y - 20,
                    life: 30
                });
            }
        }

        // CRITICAL: Mark as destroyed BEFORE removing
        if (m.c && !m.c.destroyed) {
            m.c.destroyed = true; // Mark it so updates skip it

            if (openWorld && openWorld.entityLayer) {
                openWorld.entityLayer.removeChild(m.c);
            }
            m.c.destroy();
        }

        // Also null out the reference to prevent further access
        m.c = null;
    }

    createExplosionVisuals(ctx) {
        const { openWorld } = ctx;
        const m = this.mob;

        if (!openWorld || !openWorld.entityLayer) return;

        // Explosion ring
        const ring = new PIXI.Graphics();
        ring.circle(0, 0, 15).fill({ color: 0xff4400, alpha: 0.8 });
        ring.x = m.x;
        ring.y = m.y;
        openWorld.entityLayer.addChild(ring);

        // Animate ring expansion
        let size = 15;
        const expandRing = () => {
            if (ring.destroyed) return;
            size += 10;
            ring.clear();
            ring.circle(0, 0, size).fill({ color: 0xff4400, alpha: 0.8 - (size / this.explosionRadius) });

            if (size < this.explosionRadius) {
                requestAnimationFrame(expandRing);
            } else {
                openWorld.entityLayer.removeChild(ring);
                ring.destroy();
            }
        };
        expandRing();

        // Simple explosion particles (small circles)
        for (let i = 0; i < 15; i++) {
            const particle = new PIXI.Graphics();
            const size = 3 + Math.random() * 5;
            particle.circle(0, 0, size).fill({ color: 0xff6600 });
            particle.x = m.x + (Math.random() - 0.5) * 30;
            particle.y = m.y + (Math.random() - 0.5) * 30;
            openWorld.entityLayer.addChild(particle);

            const velX = (Math.random() - 0.5) * 8;
            const velY = (Math.random() - 0.5) * 8 - 2;
            let life = 30;

            const animateParticle = () => {
                if (particle.destroyed) return;
                particle.x += velX;
                particle.y += velY;
                life--;
                particle.alpha = life / 30;

                if (life > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    openWorld.entityLayer.removeChild(particle);
                    particle.destroy();
                }
            };
            animateParticle();
        }
    }

    createWarningRing(ctx) {
        const { openWorld } = ctx;
        if (!openWorld || !openWorld.entityLayer) return;

        const m = this.mob;
        const progress = this.primeTimer / this.primeDuration;
        const radius = this.explosionRadius * (1 - progress);

        const ring = new PIXI.Graphics();
        ring.circle(0, 0, radius).stroke({ color: 0xff4400, width: 3, alpha: 0.7 });
        ring.x = m.x;
        ring.y = m.y;
        openWorld.entityLayer.addChild(ring);

        // Fade and remove
        setTimeout(() => {
            if (ring && !ring.destroyed) {
                openWorld.entityLayer.removeChild(ring);
                ring.destroy();
            }
        }, 100);
    }

    onDamage(amount, source) {
        // Return damage modifiers
        return {
            damageMult: 1,
            knockbackMult: 1.2
        };
    }
}