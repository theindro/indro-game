// createProjectileController.js - Updated with elemental arrow types
import { Container, Graphics } from 'pixi.js';
import { ARROW_SPEED, GS } from '../constants.js';

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
    FIRE: {
        name: 'fire',
        shaftColor: 0xcc6600,
        tipColor: 0xff4400,
        trailColor: 0xff6600,
        glowColor: 0xff4400,
        particleColor: 0xff6600,
        trailAlpha: 0.6
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
 * Creates a player arrow with elemental effects
 */
export function createArrow(world, px, py, tx, ty, angleOffset = 0, chainData = null, arrowType = ARROW_TYPES.NORMAL) {
    const c = new Container();
    c.x = px;
    c.y = py;

    const dx = tx - px;
    const dy = ty - py;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = ARROW_SPEED * GS;
    const angle = Math.atan2(dy, dx) + angleOffset;

    // Elemental glow effect

    if (arrowType.name !== 'normal') {

    const glow = new Graphics();
    glow.circle(0, 0, 12).fill({ color: arrowType.glowColor, alpha: 0.1 });
    c.addChild(glow);
    }

    // Arrow trail (elemental color)
    const trail = new Graphics();
    trail.rect(-14, -1.5, 14, 3).fill({ color: arrowType.trailColor, alpha: arrowType.trailAlpha });
    c.addChild(trail);

    // Arrow shaft
    const shaft = new Graphics();
    shaft.rect(-2, -1, 14, 2).fill(arrowType.shaftColor);
    c.addChild(shaft);

    // Arrow tip
    const tip = new Graphics();
    tip.moveTo(12, 0).lineTo(6, -3).lineTo(6, 3).closePath().fill(arrowType.tipColor);
    c.addChild(tip);

    // Elemental particles attached to arrow
    const particleContainer = new Container();
    c.addChild(particleContainer);

    // Create floating particles based on arrow type
    const particles = [];
    const particleCount = arrowType === ARROW_TYPES.NORMAL ? 0 : 3;

    for (let i = 0; i < particleCount; i++) {
        const particle = new Graphics();
        const size = 4 + Math.random() * 3;

        switch(arrowType.name) {
            case 'fire':
                particle.circle(0, 0, size).fill({ color: 0xff6600, alpha: 0.7 });
                break;
            case 'poison':
                particle.circle(0, 0, size).fill({ color: 0x44ff44, alpha: 0.6 });
                break;
            case 'lightning':
                particle.circle(0, 0, size).fill({ color: 0x88ccff, alpha: 0.7 });
                break;
        }

        particle.x = (Math.random() - 0.5) * 20;
        particle.y = (Math.random() - 0.5) * 10 - 5;
        particleContainer.addChild(particle);
        particles.push({ graphics: particle, offsetX: particle.x, offsetY: particle.y, phase: Math.random() * Math.PI * 2 });
    }

    c.rotation = angle;
    world.addChild(c);

    // Store particle animation data
    c.userData = {
        particles,
        arrowType,
        particleContainer,
        time: 0
    };

    return {
        c,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 140,
        chainRemaining: chainData?.chainRemaining ?? 0,
        chainHitMobs: chainData?.chainHitMobs ?? new Set(),
        damage: chainData?.damage ?? 0,
        arrowType: arrowType,
        elementalEffect: arrowType.name
    };
}

// Update projectile animation in your createCombatController.js
export function updateArrowParticleAnimation(arrow, deltaTime) {
    if (!arrow.c.userData?.particles) return;

    const data = arrow.c.userData;
    data.time += deltaTime * 0.1;

    for (let i = 0; i < data.particles.length; i++) {
        const p = data.particles[i];
        const offset = Math.sin(data.time * 3 + p.phase) * 3;

        if (data.arrowType.name === 'fire') {
            p.graphics.x = p.offsetX + offset;
            p.graphics.alpha = 0.5 + Math.sin(data.time * 5) * 0.3;
        } else if (data.arrowType.name === 'poison') {
            p.graphics.y = p.offsetY + offset;
            p.graphics.alpha = 0.4 + Math.sin(data.time * 4) * 0.2;
        } else if (data.arrowType.name === 'lightning') {
            p.graphics.x = p.offsetX + Math.sin(data.time * 8) * 5;
            p.graphics.y = p.offsetY + Math.cos(data.time * 6) * 3;
            p.graphics.alpha = 0.6 + Math.sin(data.time * 10) * 0.3;
        }
    }
}

/**
 * Creates an enemy orb with elemental effects
 */
export function createEnemyProj(world, ex, ey, px, py, type, dmg, spd = 2.8, size = 9, angleOffset = 0, elementalType = null) {
    const c = new Container();
    c.x = ex; c.y = ey;

    const elementColors = {
        fire: { glow: 0xff4400, orb: 0xff6600, core: 0xffaa44 },
        poison: { glow: 0x44ff44, orb: 0x66ff66, core: 0xaaffaa },
        lightning: { glow: 0x44aaff, orb: 0x66ccff, core: 0xaaddff },
        normal: { glow: 0x88aaff, orb: 0xaaccff, core: 0xffffff }
    };

    const colors = elementColors[elementalType] || elementColors.normal;

    // Glow effect
    const gl = new Graphics();
    gl.circle(0, 0, size + 7).fill({ color: colors.glow, alpha: 0.22 });
    c.addChild(gl);

    // Main orb
    const orb = new Graphics();
    orb.circle(0, 0, size).fill({ color: colors.orb, alpha: 0.9 });

    // Inner core
    const core = new Graphics();
    core.circle(-3, -3, size * 0.4).fill({ color: colors.core, alpha: 0.5 });
    orb.addChild(core);

    c.addChild(orb);

    // Elemental particles
    const particles = new Container();
    c.addChild(particles);

    if (elementalType) {
        for (let i = 0; i < 4; i++) {
            const particle = new Graphics();
            particle.circle(0, 0, 2).fill({ color: colors.glow, alpha: 0.6 });
            particle.x = Math.cos(i * Math.PI * 2 / 4) * size;
            particle.y = Math.sin(i * Math.PI * 2 / 4) * size;
            particles.addChild(particle);
        }
    }

    world.addChild(c);

    // FIX: Use dx and dy correctly
    const dx = px - ex;
    const dy = py - ey;
    const baseAngle = Math.atan2(dy, dx) + angleOffset;
    const sv = spd * GS;

    // Store animation data
    c.userData = {
        elementalType,
        particles,
        rotationSpeed: elementalType === 'lightning' ? 0.1 : 0.05,
        pulseSpeed: elementalType === 'fire' ? 0.15 : 0.08
    };

    return {
        c,
        vx: Math.cos(baseAngle) * sv,
        vy: Math.sin(baseAngle) * sv,
        life: 240,
        dmg,
        type,
        elementalType
    };
}

// Update enemy projectile animation (call this in your combat ticker)
export function updateEnemyProjAnimation(proj, deltaTime) {
    if (!proj.c.userData) return;

    const data = proj.c.userData;
    if (!data.particles) return;

    // Rotate particles
    data.particles.rotation += data.rotationSpeed * deltaTime;

    // Pulse effect for fire projectiles
    if (data.elementalType === 'fire') {
        const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        proj.c.scale.set(scale);
    }
}