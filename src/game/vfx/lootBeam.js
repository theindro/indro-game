import { Graphics } from "pixi.js";
import {VFX} from "../GlobalEffects.js";

/**
 * Loot beam configuration (single source of truth)
 */
export const LOOT_BEAM_BY_RARITY = {
    Magic: {
        color: 0x2ecc71,
        height: 95,
        width: 7,
        alpha: 0.42
    },
    Rare: {
        color: 0x3498db,
        height: 115,
        width: 8,
        alpha: 0.5
    },
    Epic: {
        color: 0x9b59b6,
        height: 130,
        width: 9,
        alpha: 0.55
    },
    Legendary: {
        color: 0xf39c12,
        height: 150,
        width: 10,
        alpha: 0.62
    },
};

function createParticles(container, cfg) {
    const particles = [];

    for (let i = 0; i < 8; i++) {
        const p = new Graphics();
        p.circle(0, 0, 1.5).fill({ color: 0xffffff, alpha: 0.8 });

        const x = (Math.random() - 0.5) * cfg.width * 6;
        const y = -Math.random() * cfg.height;

        p.x = x;
        p.y = y;

        container.addChild(p);

        particles.push({
            sprite: p,
            baseX: x,
            speed: 0.4 + Math.random() * 0.8,
        });
    }

    return particles;
}

export function createLootBeam(rarityName) {
    const cfg = LOOT_BEAM_BY_RARITY[rarityName];
    if (!cfg) return null;

    const g = new Graphics();
    const h = cfg.height;
    const w = cfg.width;

    // outer glow
    g.poly([
        -w * 2.2, 0,
        w * 2.2, 0,
        w * 0.6, -h,
        -w * 0.6, -h,
    ]).fill({ color: cfg.color, alpha: cfg.alpha * 0.12 });

    // mid
    g.poly([
        -w * 1.2, 0,
        w * 1.2, 0,
        w * 0.35, -h,
        -w * 0.35, -h,
    ]).fill({ color: cfg.color, alpha: cfg.alpha * 0.22 });

    // core
    g.poly([
        -w * 0.6, 0,
        w * 0.6, 0,
        w * 0.15, -h,
        -w * 0.15, -h,
    ]).fill({ color: cfg.color, alpha: cfg.alpha });

    // inner white spine
    g.poly([
        -w * 0.18, 0,
        w * 0.18, 0,
        w * 0.05, -h,
        -w * 0.05, -h,
    ]).fill({ color: 0xffffff, alpha: cfg.alpha * 0.65 });

    // ground glow
    g.ellipse(0, 0, w * 5.5, w * 2.2).fill({ color: cfg.color, alpha: 0.14 });
    g.ellipse(0, 0, w * 3.5, w * 1.4).fill({ color: cfg.color, alpha: 0.24 });
    g.ellipse(0, 0, w * 1.8, w * 0.7).fill({ color: 0xffffff, alpha: 0.28 });

    g.blendMode = "add";
    g.eventMode = "none";

    const particles = createParticles(g, cfg);

    return {
        graphic: g,
        cfg,
        particles
    };
}

export function updateLootBeam(beam, phase, dt) {
    if (!beam?.graphic) return;

    const pulse = 0.85 + Math.sin(phase) * 0.15;
    beam.graphic.alpha = beam.cfg.alpha * pulse;

    // particle animation
    for (const p of beam.particles) {
        p.sprite.y -= p.speed * dt;

        if (p.sprite.y < -beam.cfg.height) {
            p.sprite.y = 0;
            p.sprite.x = (Math.random() - 0.5) * beam.cfg.width * 6;
        }
    }
}

export function createLootBeamGlows(container, cfg) {
    const color = cfg.color;
    const glows = [];

    const ground = VFX.addGlow(0, 0, {
        color,
        alpha: Math.min(0.48, cfg.alpha * 0.72),
        scale: 0.35,
    }, container);
    if (ground) glows.push(ground);

    return glows;
}
