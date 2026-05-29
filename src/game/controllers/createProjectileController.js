// createProjectileController.js - Updated with elemental arrow types
import {Container, Graphics} from 'pixi.js';
import {ARROW_SPEED, DEFAULT_ATTACK_RANGE} from '../constants.js';
import {VFX} from "../GlobalEffects.js";
/* ── player arrow ── */

// Arrow type configurations
export const ARROW_TYPES = {
    NORMAL: {
        name: 'normal',
        shaftColor: 0xe8d5b7,
        tipColor: 0xb5e8ff,
        trailColor: 0x9b59b6,
        glowColor: 0x8866ff,
        particleColor: 0x8866ff,
        trailAlpha: 0.32
    },
    BURN: {
        name: 'burn',
        shaftColor: 0xffaa66,
        tipColor: 0xfff0dd,
        trailColor: 0xff8844,
        glowColor: 0xff6622,
        particleColor: 0xffcc88,
        trailAlpha: 0.35
    },
    POISON: {
        name: 'poison',
        shaftColor: 0x44aa44,
        tipColor: 0x88ff88,
        trailColor: 0x44ff44,
        glowColor: 0x44ff44,
        particleColor: 0x88ff88,
        trailAlpha: 0.5
    },
    LIGHTNING: {
        name: 'lightning',
        shaftColor: 0x88aaff,
        tipColor: 0xaaccff,
        trailColor: 0x44aaff,
        glowColor: 0x44aaff,
        particleColor: 0x88ccff,
        trailAlpha: 0.6
    },
    ICE: {
        name: 'ice',
        shaftColor: 0x88aaff,
        tipColor: 0xaaccff,
        trailColor: 0x44aaff,
        glowColor: 0x44aaff,
        particleColor: 0x88ccff,
        trailAlpha: 0.6
    }
};

/**
 * Empower / ignite arrow — soft additive halo, hot core, wisp embers (no blob circles).
 * @param {import('pixi.js').Container} c
 */
function buildBurnArrowVisual(c) {
    const glowLayer = new Container();
    glowLayer.zIndex = 0;
    glowLayer.blendMode = 'add';

    const outer = new Graphics();
    outer.ellipse(2, 0, 22, 10).fill({ color: 0xff4400, alpha: 0.07 });
    const mid = new Graphics();
    mid.ellipse(2, 0, 15, 7).fill({ color: 0xff6622, alpha: 0.14 });
    const hot = new Graphics();
    hot.ellipse(7, 0, 10, 5).fill({ color: 0xffdd99, alpha: 0.2 });
    glowLayer.addChild(outer, mid, hot);

    const trailGlow = new Graphics();
    trailGlow.moveTo(-20, 0).lineTo(5, 0);
    trailGlow.stroke({ color: 0xff7733, width: 5, alpha: 0.22, cap: 'round' });
    trailGlow.blendMode = 'add';

    const trailCore = new Graphics();
    trailCore.moveTo(-15, 0).lineTo(8, 0);
    trailCore.stroke({ color: 0xffeecc, width: 1.5, alpha: 0.5, cap: 'round' });

    const shaft = new Graphics();
    shaft.roundRect(-1, -1.2, 13, 2.4, 1).fill({ color: 0xdd6622 });
    shaft.roundRect(0, -0.55, 11, 1.1, 0.5).fill({ color: 0xfff0dd, alpha: 0.9 });

    const tip = new Graphics();
    tip.moveTo(12, 0).lineTo(5, -2.8).lineTo(5, 2.8).closePath().fill({ color: 0xfff8ee });
    tip.moveTo(11, 0).lineTo(6.5, -1.6).lineTo(6.5, 1.6).closePath().fill({ color: 0xffaa55, alpha: 0.85 });

    c.addChild(glowLayer);
    c.addChild(trailGlow);
    c.addChild(trailCore);
    c.addChild(shaft);
    c.addChild(tip);

    const embers = [];
    for (let i = 0; i < 2; i++) {
        const ember = new Graphics();
        ember.moveTo(0, 1).lineTo(0, -3 - Math.random() * 2);
        ember.stroke({ color: 0xffcc77, width: 1.1, alpha: 0.5, cap: 'round' });
        ember.blendMode = 'add';
        ember.x = 1 + i * 6;
        ember.y = (Math.random() - 0.5) * 2.5;
        ember.rotation = (Math.random() - 0.5) * 0.45;
        c.addChild(ember);
        embers.push({
            graphics: ember,
            baseX: ember.x,
            baseY: ember.y,
            phase: Math.random() * Math.PI * 2,
            drift: 0.6 + Math.random() * 0.5,
        });
    }

    c.userData = {
        arrowType: ARROW_TYPES.BURN,
        burnGlowLayer: glowLayer,
        embers,
        time: 0,
    };
}

/**
 * @param {object} [trajectory]
 * @param {number} [trajectory.maxRange] Max travel distance from spawn (px), from player stats / gear.
 * @param {number} [trajectory.speedScale] Multiplier on {@link ARROW_SPEED} only (does not change max range).
 */
export function createArrow(world, px, py, tx, ty, angleOffset = 0, chainData = null, arrowType = ARROW_TYPES.NORMAL, trajectory = {}) {
    const c = new Container();
    c.x = px;
    c.y = py;
    c.sortableChildren = true;

    const dx = tx - px;
    const dy = ty - py;
    const speedScale = trajectory.speedScale ?? 1;
    const spd = ARROW_SPEED * speedScale;
    const angle = Math.atan2(dy, dx) + angleOffset;
    const maxRange = trajectory.maxRange ?? DEFAULT_ATTACK_RANGE;

    let vfxGlow = null;

    if (arrowType.name === 'burn') {
        buildBurnArrowVisual(c);
        vfxGlow = VFX.addGlow(0, 0, {
            color: 0xff7722,
            alpha: 0.18,
            scale: 0.28,
            texture: 'glow2',
        }, c);
    } else {
        if (arrowType.name !== 'normal') {
            const glow = new Graphics();
            glow.circle(0, 0, 10).fill({ color: arrowType.glowColor, alpha: 0.08 });
            glow.blendMode = 'add';
            c.addChild(glow);
        }

        const trail = new Graphics();
        trail.rect(-14, -1.5, 14, 3).fill({ color: arrowType.trailColor, alpha: arrowType.trailAlpha });
        c.addChild(trail);

        const shaft = new Graphics();
        shaft.rect(-2, -1, 14, 2).fill(arrowType.shaftColor);
        c.addChild(shaft);

        const tip = new Graphics();
        tip.moveTo(12, 0).lineTo(6, -3).lineTo(6, 3).closePath().fill(arrowType.tipColor);
        c.addChild(tip);

        const particleContainer = new Container();
        c.addChild(particleContainer);

        const particles = [];
        const particleCount = arrowType === ARROW_TYPES.NORMAL ? 0 : 2;

        for (let i = 0; i < particleCount; i++) {
            const particle = new Graphics();
            const size = 2 + Math.random() * 2;

            switch (arrowType.name) {
                case 'poison':
                    particle.circle(0, 0, size).fill({ color: 0x66ff88, alpha: 0.45 });
                    break;
                case 'lightning':
                    particle.circle(0, 0, size).fill({ color: 0x99ddff, alpha: 0.55 });
                    break;
                default:
                    break;
            }

            particle.x = (Math.random() - 0.5) * 14;
            particle.y = (Math.random() - 0.5) * 8 - 4;
            particleContainer.addChild(particle);
            particles.push({
                graphics: particle,
                offsetX: particle.x,
                offsetY: particle.y,
                phase: Math.random() * Math.PI * 2,
            });
        }

        c.userData = {
            particles,
            arrowType,
            particleContainer,
            time: 0,
        };
    }

    c.rotation = angle;
    world.addChild(c);

    return {
        c,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        spawnX: px,
        spawnY: py,
        maxRange,
        life: 6000,
        chainRemaining: chainData?.chainRemaining ?? 0,
        chainHitMobs: chainData?.chainHitMobs ?? new Set(),
        damage: chainData?.damage ?? 0,
        arrowType: arrowType,
        elementalEffect: arrowType.name,
        vfxGlow,
    };
}

/** Subtle motion on elemental / empower arrow attachments. */
export function updateArrowParticleAnimation(arrow, dtSec = 1 / 60) {
    const data = arrow.c?.userData;
    if (!data) return;

    data.time += dtSec * 7;

    if (data.arrowType?.name === 'burn' || data.burnGlowLayer) {
        const pulse = 0.92 + Math.sin(data.time * 5) * 0.08;
        if (data.burnGlowLayer && !data.burnGlowLayer.destroyed) {
            data.burnGlowLayer.scale.set(pulse);
            data.burnGlowLayer.alpha = 0.88 + Math.sin(data.time * 7) * 0.12;
        }
        for (const e of data.embers ?? []) {
            if (e.graphics.destroyed) continue;
            e.graphics.alpha = 0.3 + Math.sin(data.time * 6 + e.phase) * 0.22;
            e.graphics.x = e.baseX + Math.sin(data.time * 4 + e.phase) * e.drift;
            e.graphics.y = e.baseY + Math.cos(data.time * 5 + e.phase) * e.drift * 0.45;
        }
        return;
    }

    if (!data.particles?.length) return;

    for (let i = 0; i < data.particles.length; i++) {
        const p = data.particles[i];
        const offset = Math.sin(data.time * 3 + p.phase) * 2;

        if (data.arrowType.name === 'poison') {
            p.graphics.y = p.offsetY + offset;
            p.graphics.alpha = 0.35 + Math.sin(data.time * 4) * 0.18;
        } else if (data.arrowType.name === 'lightning') {
            p.graphics.x = p.offsetX + Math.sin(data.time * 8) * 4;
            p.graphics.y = p.offsetY + Math.cos(data.time * 6) * 2.5;
            p.graphics.alpha = 0.45 + Math.sin(data.time * 10) * 0.25;
        }
    }
}

/**
 * Creates an enemy orb with elemental effects
 */
export function createEnemyProj(world, ex, ey, px, py, type, dmg, spd = 1, size = 9, angleOffset = 0, elementalType = null) {
    const c = new Container();
    c.x = ex;
    c.y = ey;
    c.sortableChildren = true;

    const elementColors = {
        burn: {glow: 0xff4400, orb: 0xff6600, core: 0xffaa44},
        poison: {glow: 0x44ff44, orb: 0x66ff66, core: 0xaaffaa},
        lightning: {glow: 0x44aaff, orb: 0x66ccff, core: 0xaaddff},
        normal: {glow: 0xff4400, orb: 0xff6600, core: 0xffaa44}
    };

    const colors = elementColors[elementalType] || elementColors.normal;

    // Glow
    const glowContainer = new Container();

    // OUTER SOFT GLOW
    const glowOuter = new Graphics();
    glowOuter.circle(0, 0, size + 30).fill({
        color: colors.glow,
        alpha: 0.06
    });
    glowContainer.addChild(glowOuter);

    // MID GLOW
    const glowMid = new Graphics();
    glowMid.circle(0, 0, size + 15).fill({
        color: colors.glow,
        alpha: 0.12
    });
    glowContainer.addChild(glowMid);

    // INNER HOT GLOW
    const glowInner = new Graphics();
    glowInner.circle(0, 0, size + 10).fill({
        color: colors.glow,
        alpha: 0.25
    });

    glowContainer.addChild(glowInner);

    glowContainer.blendMode = 'add';

    c.addChild(glowContainer);

    const trail = new Graphics();

    c.addChild(trail);

    // Main orb
    const orb = new Graphics();
    orb.circle(0, 0, size).fill({color: colors.orb, alpha: 0.9});

    // Core
    const core = new Graphics();
    core.circle(-3, -3, size * 0.4).fill({color: colors.core, alpha: 0.5});
    orb.addChild(core);
    c.addChild(orb);

    // Particles for elemental types
    const particles = new Container();
    c.addChild(particles);

    for (let i = 0; i < 4; i++) {
        const p = new Graphics();
        p.circle(0, 0, 2).fill({color: colors.glow, alpha: 0.6});
        p.x = Math.cos(i * Math.PI * 2 / 4) * (size * 0.9);
        p.y = Math.sin(i * Math.PI * 2 / 4) * (size * 0.9);
        particles.addChild(p);
    }

    world.addChild(c);

    // glow automatically follows projectile
    c.glow = VFX.addGlow(0, 0, {
        color: colors.glow,
        scale: 0.5
    }, c);

    // Direction calculation
    const dx = px - ex;
    const dy = py - ey;
    const angle = Math.atan2(dy, dx) + angleOffset;
    // `spd` = dimensionless scale (typ. 2.5–5); world velocity px/s = spd * 60 (matches dt integration in createProjectileSystem).
    const speed = Math.max(0.5, spd) * 60;

    c.userData = {
        elementalType,
        particles,
        glowContainer,
        glowInner,
        glowMid,
        glowOuter,
        trail,
        t: Math.random() * 100,
        rotationSpeed: elementalType === 'lightning' ? 0.12 : 0.06,
        pulseSpeed: elementalType === 'burn' ? 0.18 : 0.09
    };

    return {
        c,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        dmg,
        type,
        elementalType,
        size
    };
}