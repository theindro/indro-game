// abilities/FrostArrow.js - Fixed cleanup
import { Container, Graphics } from 'pixi.js';
import { showFloat } from '../utils/floatText.js';
import { burst } from '../utils/particles.js';
import { useGameStore } from '../../stores/gameStore.js';
import {applyStatusEffect, createFreezeEffect} from "../statusEffects.js";

export function useFrostArrow(ctx, targetX, targetY) {
    const {particles, floats, mobs, bosses, openWorld, shakeRef} = ctx;

    const store = useGameStore.getState();
    const stats = store.player.stats;
    const ability = store.abilities.ability4;
    const now = performance.now();
    const {x: px, y: py} = store.player;

    if (now < ability.cooldownEnd) {
        console.log(`❄️ Frost Arrow on cooldown!`);
        return false;
    }

    store.useAbility(4, now);

    const damageMult = ability.stats.damageMultiplier + (ability.level * 0.15);
    const explosionRadius = ability.stats.explosionRadius;
    const freezeDuration = ability.stats.freezeDuration;
    const slowAmount = ability.stats.slowAmount;

    let angle;
        angle = Math.atan2(targetY - py, targetX - px);

    burst(openWorld.entityLayer, particles, px, py, 0x88ccff, 15, 3);

    const speed = ability.stats.projectileSpeed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Create frost arrow graphics
    const arrowContainer = new Container();
    arrowContainer.x = px;
    arrowContainer.y = py;

    const glow = new Graphics();
    glow.circle(0, 0, 20).fill({ color: 0x88ccff, alpha: 0.4 });
    arrowContainer.addChild(glow);

    const shaft = new Graphics();
    shaft.rect(-4, -3, 24, 6).fill({ color: 0xaaddff });
    arrowContainer.addChild(shaft);

    const tip = new Graphics();
    tip.moveTo(20, 0).lineTo(10, -5).lineTo(10, 5).closePath().fill({ color: 0xffffff });
    arrowContainer.addChild(tip);

    for (let i = 0; i < 3; i++) {
        const crystal = new Graphics();
        crystal.moveTo(5 + i * 5, 0).lineTo(3 + i * 5, -4).lineTo(7 + i * 5, -2).closePath();
        crystal.fill({ color: 0x88ccff });
        arrowContainer.addChild(crystal);
    }

    const snowParticles = [];
    for (let i = 0; i < 6; i++) {
        const snow = new Graphics();
        snow.circle(0, 0, 2).fill({ color: 0xffffff, alpha: 0.7 });
        snow.x = (Math.random() - 0.5) * 30;
        snow.y = (Math.random() - 0.5) * 20;
        arrowContainer.addChild(snow);
        snowParticles.push(snow);
    }

    arrowContainer.rotation = angle;
    openWorld.entityLayer.addChild(arrowContainer);

    let arrowLife = 100;
    let arrowX = px, arrowY = py;
    let explosionDone = false;

    function cleanupExplosion(elements) {
        for (const element of elements) {
            if (element && !element.destroyed) {
                openWorld.entityLayer.removeChild(element);
                element.destroy();
            }
        }
    }

    function explodeFrostArrow(x, y) {
        if (explosionDone) return;
        explosionDone = true;

        // Remove arrow
        openWorld.entityLayer.removeChild(arrowContainer);
        arrowContainer.destroy();

        // Create explosion ring
        const explosionRing = new Graphics();
        explosionRing.circle(0, 0, explosionRadius).stroke({ color: 0xaaddff, width: 4, alpha: 0.8 });
        explosionRing.x = x;
        explosionRing.y = y;
        openWorld.entityLayer.addChild(explosionRing);

        let scale = 1;

        function animateExplosion() {
            if (explosionRing.destroyed) return;
            scale += 0.15;
            explosionRing.scale.set(scale);
            explosionRing.alpha -= 0.05;
            if (explosionRing.alpha <= 0) {
                openWorld.entityLayer.removeChild(explosionRing);
                explosionRing.destroy();
            } else {
                requestAnimationFrame(animateExplosion);
            }
        }

        requestAnimationFrame(animateExplosion);

        // Impact burst
        burst(openWorld.entityLayer, particles, x, y, 0xaaddff, 25, 4);

        // Create ice spikes with auto-cleanup
        const spikes = [];
        for (let i = 0; i < 12; i++) {
            const spikeAngle = (i / 12) * Math.PI * 2;
            const spike = new Graphics();
            spike.moveTo(x, y);
            spike.lineTo(x + Math.cos(spikeAngle) * explosionRadius, y + Math.sin(spikeAngle) * explosionRadius);
            spike.stroke({ color: 0x88ccff, width: 3, alpha: 0.2 });
            openWorld.entityLayer.addChild(spike);
            spikes.push(spike);
        }

        // Auto-remove spikes after animation
        setTimeout(() => {
            for (const spike of spikes) {
                if (spike && !spike.destroyed) {
                    openWorld.entityLayer.removeChild(spike);
                    spike.destroy();
                }
            }
        }, 300);

        const damage = stats.damage * damageMult;

        // Damage mobs
        for (let mi = mobs.length - 1; mi >= 0; mi--) {
            const mob = mobs[mi];
            const dist = Math.hypot(mob.x - x, mob.y - y);
            if (dist < explosionRadius) {
                mob.hp -= damage;
                showFloat(floats, mob.x, mob.y - 30, `❄️ ${Math.floor(damage)}`, '#fff');

                applyStatusEffect(mob, createFreezeEffect(freezeDuration, slowAmount));

                burst(openWorld.entityLayer, particles, mob.x, mob.y, 0x88ddff, 8, 2);

                if (mob.hp <= 0) {
                    burst(openWorld.entityLayer, particles, mob.x, mob.y, 0xffd700, 14, 4);
                    store.addKills(1);
                    openWorld.entityLayer?.removeChild(mob.c);
                    mobs.splice(mi, 1);
                }
            }
        }

        // Damage bosses
        for (let bi = bosses.length - 1; bi >= 0; bi--) {
            const boss = bosses[bi];
            if (boss.dead) continue;
            const dist = Math.hypot(boss.x - x, boss.y - y);
            if (dist < explosionRadius) {
                boss.hp -= damage;

                showFloat(floats, boss.x, boss.y - 60, `❄️ ${Math.floor(damage)}`, '#fff');

                applyStatusEffect(boss, createFreezeEffect(freezeDuration * 0.5, slowAmount * 0.5));

                burst(openWorld.entityLayer, particles, boss.x, boss.y, 0x88ddff, 12, 3);
            }
        }

        // Screen shake
        shakeRef.value = Math.max(shakeRef.value, 12);

        // Play sound
        // audioManager.playSFX('/sounds/frost-explosion.ogg', 0.5);

        // Frost ground effect that fades out
        const frostGround = new Graphics();
        frostGround.circle(0, 0, explosionRadius).fill({ color: 0x88ccff, alpha: 0.15 });
        frostGround.x = x;
        frostGround.y = y;
        openWorld.entityLayer.addChild(frostGround);

        // Fade out ground effect
        let fadeAlpha = 1;
        function fadeFrostGround() {
            if (frostGround.destroyed) return;
            fadeAlpha -= 0.05;
            frostGround.alpha = fadeAlpha;
            if (fadeAlpha <= 0) {
                openWorld.entityLayer.removeChild(frostGround);
                frostGround.destroy();
            } else {
                requestAnimationFrame(fadeFrostGround);
            }
        }
        setTimeout(() => fadeFrostGround(), 100);
    }

    function animateFrostArrow() {
        if (explosionDone) return;

        arrowX += vx;
        arrowY += vy;
        arrowContainer.x = arrowX;
        arrowContainer.y = arrowY;

        for (const snow of snowParticles) {
            if (snow.destroyed) continue;
            snow.x += (Math.random() - 0.5) * 1.5;
            snow.y += Math.random() * 1;
            snow.alpha -= 0.02;
        }

        arrowLife--;

        for (const mob of mobs) {
            if (mob.hp <= 0) continue;
            if (Math.hypot(arrowX - mob.x, arrowY - mob.y) < 30) {
                explodeFrostArrow(arrowX, arrowY);
                return;
            }
        }

        for (const boss of bosses) {
            if (boss.dead) continue;
            if (Math.hypot(arrowX - boss.x, arrowY - boss.y) < 50) {
                explodeFrostArrow(arrowX, arrowY);
                return;
            }
        }

        if (arrowLife <= 0 || !openWorld.isInsideWorld(arrowX, arrowY)) {
            explodeFrostArrow(arrowX, arrowY);
            return;
        }

        requestAnimationFrame(animateFrostArrow);
    }

    animateFrostArrow();
    return true;
}