import * as PIXI from 'pixi.js';
import {useGameStore} from '../../../stores/gameStore.js';
import {GroundAttackController} from '../createGroundAttackController.js';
import {VFX} from '../../GlobalEffects.js';

export class ExploderArchetype {
    constructor(mob, entityLayer) {
        this.mob = mob;
        this.exploded = false;
        this.explosionRadius = 75;
        this.explosionDamage = 20;
        this.explodeDistance = 45;
        this.priming = false;
        this.primeTimer = 0;
        this.primeDuration = 0.5; // 0.5 seconds in seconds (not frames)

        // Initialize ground attack manager for explosion
        this.groundAttacks = new GroundAttackController(entityLayer, mob);
    }

    update(ctx) {
        const {px, py, dt, openWorld} = ctx;
        const m = this.mob;

        // Already exploded? do nothing
        if (this.exploded) {
            return {moveX: 0, moveY: 0, attackOverride: true};
        }

        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        // Check if should explode (near player OR dead)
        const shouldExplode = distToPlayer < this.explodeDistance || m.hp <= 0;

        if (shouldExplode && !this.priming) {
            this.startExplosion(ctx);
            return {moveX: 0, moveY: 0, attackOverride: true};
        }

        // Handle priming (wait before exploding)
        if (this.priming) {
            this.primeTimer -= dt; // Use dt for seconds-based cooldown

            // Visual warning - flash red
            const flashRate = Math.floor(Date.now() / 100) % 6 < 3;
            if (flashRate) {
                if (m.body) m.body.tint = 0xff0000;
            } else {
                if (m.body && m.body.tint === 0xff0000) m.body.tint = 0xffffff;
            }

            // Scale pulse
            const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.15;
            m.c.scale.set(pulse, pulse);

            // Update ground attack warning (visual indicator)
            if (this.groundAttacks) {
                this.groundAttacks.update(px, py, null); // Update without damage callback
            }

            // Explode when timer ends
            if (this.primeTimer <= 0) {
                this.doExplosion(ctx);
            }

            return {moveX: 0, moveY: 0, attackOverride: true};
        }

        // Normal movement - chase player (faster than tank)
        let moveX = 0, moveY = 0;
        if (distToPlayer > 20) {
            moveX = ((px - m.x) / distToPlayer) * m.speed * 1.3;
            moveY = ((py - m.y) / distToPlayer) * m.speed * 1.3;
        }

        return {moveX, moveY, attackOverride: false};
    }

    startExplosion(ctx) {
        if (this.priming || this.exploded) return;

        this.priming = true;
        this.primeTimer = this.primeDuration;

        const m = this.mob;

        // Create ground attack warning circle
        this.groundAttacks.addAttack(m.x, m.y, {
            shape: 'circle',
            color: 0xff4400,
            warningColor: 0xff0000,
            innerColor: 0xff8844,
            radius: this.explosionRadius,
            warningDuration: 30, // 0.5 seconds at 60fps
            damage: 0, // No damage from warning, actual damage happens in doExplosion
            trackPlayer: false,
            onHit: null,
            onComplete: () => {
                // Warning complete, explosion will trigger separately
            }
        });

        // Add floating warning text
        VFX.addFloat('💣 !!!', m.x, m.y - 50, '#ff4400');
        VFX.addFloat('⚠️ DANGER ⚠️', m.x, m.y - 80, '#ff0000');

        // Screen shake for warning
        VFX.shake(3);
    }

    doExplosion(ctx) {
        if (this.exploded) return;
        this.exploded = true;


        const {openWorld} = ctx;
        const m = this.mob;

        // Screen shake
        VFX.shake(12);

        // Create explosion visuals using ground attack for the actual explosion
        this.groundAttacks.addAttack(m.x, m.y, {
            shape: 'circle',
            color: 0xff6600,
            warningColor: 0xff4400,
            innerColor: 0xffaa66,
            radius: this.explosionRadius,
            warningDuration: 1, // Instant explosion
            damage: this.explosionDamage,
            trackPlayer: false,
            onHit: (hitX, hitY) => {
                // Visual feedback on hit
                VFX.addFloat('💥', hitX, hitY - 20, '#ff4400');
                VFX.burst(hitX, hitY, 0xff4400, 10, 5);
            },
            onComplete: () => {
                console.log('💥 Explosion complete');
            }
        });

        // Additional particle effects
        VFX.burst(m.x, m.y, 0xff4400, 30, 8);  // Fire particles
        VFX.burst(m.x, m.y, 0xffaa00, 20, 6);  // Sparks
        VFX.smoke(m.x, m.y);                   // Smoke puff

        // Multiple smoke puffs for bigger explosion
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                VFX.smoke(m.x + (Math.random() - 0.5) * 50, m.y + (Math.random() - 0.5) * 50);
            }, i * 50);
        }

        // Add explosion text
        VFX.addFloat('💥 EXPLOSION!', m.x, m.y - 40, '#ff6600');
        VFX.addFloat('💀', m.x, m.y, '#ff0000');

        // Damage player if in range (handled by ground attack, but also do immediate check)
        const {px, py} = ctx;
        const distToPlayer = Math.hypot(px - m.x, py - m.y);

        if (distToPlayer < this.explosionRadius) {
            const distanceFactor = 1 - (distToPlayer / this.explosionRadius);
            const damage = Math.floor(this.explosionDamage * (0.5 + distanceFactor * 0.5));
            useGameStore.getState().damagePlayer(damage, 'explosion');

            // Knockback from explosion
            const angle = Math.atan2(py - m.y, px - m.x);
            const knockback = {x: Math.cos(angle) * 180, y: Math.sin(angle) * 180};
            if (ctx.applyKnockback) ctx.applyKnockback(knockback);
        }

        // CRITICAL: Mark as destroyed and remove mob
        if (m.c && !m.c.destroyed) {

            // Flash white before removal
            if (m.body) m.body.tint = 0xffffff;

            if (openWorld && openWorld.entityLayer && m.c && !m.c.destroyed) {
                openWorld.entityLayer.removeChild(m.c);
                m.c.destroy();
            }

            m.c.destroyed = true;
        }

        m.c = null;
    }

    onDamage(amount, source) {
        // Return damage modifiers
        return {
            damageMult: 1,
            knockbackMult: 1.2
        };
    }

    // Cleanup method
    destroy() {
        if (this.groundAttacks) {
            this.groundAttacks.clear();
            this.groundAttacks = null;
        }
    }
}