// abilities/FrostArrow.js - Fixed cleanup
import {Container, Graphics} from 'pixi.js';
import {useGameStore} from '../../stores/gameStore.js';
import {applyStatusEffect, createFreezeEffect, STATUS_COLORS_RGBA} from "../statusEffects.js";
import {VFX} from "../GlobalEffects.js";

export function useFrostArrow(ctx, targetX, targetY) {
    const {mobs, bosses, openWorld} = ctx;

    const store = useGameStore.getState();
    const stats = store.player.stats;
    const ability = store.abilities.ability4;
    const now = performance.now();
    const {x: px, y: py} = store.player.location;

    if (now < ability.cooldownEnd) {
        console.log(`❄️ Frost Arrow on cooldown!`);
        return false;
    }

    store.useAbility(4, now);

    const damageMult = ability.damageMultiplier + (ability.level * 0.15);
    const explosionRadius = ability.explosionRadius;
    const freezeDuration = ability.freezeDuration;
    const slowAmount = ability.slowAmount;

    let angle;
    angle = Math.atan2(targetY - py, targetX - px);

    //VFX.burst(px, py, 0x88ccff, 15, 3);

    const speedPxPerSec = (ability.projectileSpeed ?? 11) * 60;
    const vx = Math.cos(angle) * speedPxPerSec;
    const vy = Math.sin(angle) * speedPxPerSec;

    // Create frost arrow graphics
    const arrowContainer = new Container();
    arrowContainer.x = px;
    arrowContainer.y = py;

    const glow = new Graphics();
    glow.circle(0, 0, 20).fill({color: 0x88ccff, alpha: 0.4});
    arrowContainer.addChild(glow);

    const frostSkillGlow = VFX.addGlow(0, 0, {
        color: 0xaaddff,
        alpha: 0.38,
        scale: 1.15,
        texture: 'glow2',
    }, arrowContainer);

    const shaft = new Graphics();
    shaft.rect(-4, -3, 24, 6).fill({color: 0xaaddff});
    arrowContainer.addChild(shaft);

    const tip = new Graphics();
    tip.moveTo(20, 0).lineTo(10, -5).lineTo(10, 5).closePath().fill({color: 0xffffff});
    arrowContainer.addChild(tip);

    for (let i = 0; i < 3; i++) {
        const crystal = new Graphics();
        crystal.moveTo(5 + i * 5, 0).lineTo(3 + i * 5, -4).lineTo(7 + i * 5, -2).closePath();
        crystal.fill({color: 0x88ccff});
        arrowContainer.addChild(crystal);
    }

    const snowParticles = [];
    for (let i = 0; i < 6; i++) {
        const snow = new Graphics();
        snow.circle(0, 0, 2).fill({color: 0xffffff, alpha: 0.7});
        snow.x = (Math.random() - 0.5) * 30;
        snow.y = (Math.random() - 0.5) * 20;
        arrowContainer.addChild(snow);
        snowParticles.push(snow);
    }

    arrowContainer.rotation = angle;
    openWorld.entityLayer.addChild(arrowContainer);

    let arrowLifeSec = 100 / 60;
    let arrowX = px;
    let arrowY = py;
    let explosionDone = false;
    let lastTick = performance.now();

    function animateFrostArrow(now) {
        if (explosionDone) return;

        const dt = Math.min((now - lastTick) / 1000, 0.05);
        lastTick = now;

        arrowX += vx * dt;
        arrowY += vy * dt;
        arrowContainer.x = arrowX;
        arrowContainer.y = arrowY;

        for (const snow of snowParticles) {
            if (snow.destroyed) continue;
            snow.x += (Math.random() - 0.5) * 1.5 * 60 * dt;
            snow.y += Math.random() * 60 * dt;
            snow.alpha -= 1.2 * dt;
        }

        arrowLifeSec -= dt;

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

        if (arrowLifeSec <= 0 || !openWorld.isInsideWorld(arrowX, arrowY)) {
            explodeFrostArrow(arrowX, arrowY);
            return;
        }

        requestAnimationFrame(animateFrostArrow);
    }

    requestAnimationFrame(animateFrostArrow);

    function disposeFrostArrowVisual() {
        if (frostSkillGlow) {
            VFX.removeAttached(frostSkillGlow);
        }
        if (arrowContainer.parent) {
            openWorld.entityLayer.removeChild(arrowContainer);
        }
        arrowContainer.destroy({ children: true });
    }

    function explodeFrostArrow(x, y) {
        if (explosionDone) return;
        explosionDone = true;

        disposeFrostArrowVisual();

        // Create explosion ring
        const explosionRing = new Graphics();
        explosionRing.circle(0, 0, explosionRadius).stroke({color: 0xaaddff, width: 4, alpha: 0.8});
        explosionRing.x = x;
        explosionRing.y = y;
        openWorld.entityLayer.addChild(explosionRing);

        let scale = 1;
        let ringLast = performance.now();

        function animateExplosion(now) {
            if (explosionRing.destroyed) return;
            const dt = Math.min((now - ringLast) / 1000, 0.05);
            ringLast = now;
            scale += 9 * dt;
            explosionRing.scale.set(scale);
            explosionRing.alpha -= 3 * dt;
            if (explosionRing.alpha <= 0) {
                openWorld.entityLayer.removeChild(explosionRing);
                explosionRing.destroy();
            } else {
                requestAnimationFrame(animateExplosion);
            }
        }

        requestAnimationFrame(animateExplosion);

        // Impact burst
        // VFX.burst(x, y, 0xaaddff, 25, 4);

        // Create ice spikes with auto-cleanup
        const spikes = [];
        for (let i = 0; i < 12; i++) {
            const spikeAngle = (i / 12) * Math.PI * 2;
            const spike = new Graphics();
            spike.moveTo(x, y);
            spike.lineTo(x + Math.cos(spikeAngle) * explosionRadius, y + Math.sin(spikeAngle) * explosionRadius);
            spike.stroke({color: 0x88ccff, width: 3, alpha: 0.2});
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
                VFX.addFloat(`❄️ ${Math.floor(damage)}`,mob.x, mob.y - 30, '#fff');

                applyStatusEffect(mob, createFreezeEffect(freezeDuration, slowAmount));


                VFX.burst(mob.x, mob.y, 0xffd700);

                if (mob.hp <= 0) {
                    //VFX.burst(mob.x, mob.y, 0xffd700, 14, 4);
                    store.addKills(1);
                    store.addXP(mob.exp);
                    openWorld.totemWaveEvent?.onMobRemoved(mob);
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

                VFX.addFloat(`❄️ ${Math.floor(damage)}`, boss.x, boss.y - 60, '#fff');

                applyStatusEffect(boss, createFreezeEffect(freezeDuration * 0.5, slowAmount * 0.5));

                VFX.burst(boss.x, boss.y, 0xffd700);
            }
        }

        // Screen shake
        VFX.shake(12);

        // Play sound
        // audioManager.playSFX('/sounds/frost-explosion.ogg', 0.5);

        // Frost ground effect that fades out
        const frostGround = new Graphics();
        frostGround.circle(0, 0, explosionRadius).fill({color: 0x88ccff, alpha: 0.15});
        frostGround.x = x;
        frostGround.y = y;
        openWorld.entityLayer.addChild(frostGround);

        // Fade out ground effect
        let fadeAlpha = 1;
        let frostLast = performance.now();

        function fadeFrostGround(now) {
            if (frostGround.destroyed) return;
            const dt = Math.min((now - frostLast) / 1000, 0.05);
            frostLast = now;
            fadeAlpha -= 3 * dt;
            frostGround.alpha = fadeAlpha;
            if (fadeAlpha <= 0) {
                openWorld.entityLayer.removeChild(frostGround);
                frostGround.destroy();
            } else {
                requestAnimationFrame(fadeFrostGround);
            }
        }

        requestAnimationFrame(fadeFrostGround);
    }

    return true;
}