import { Container, Graphics } from 'pixi.js';
import { ARROW_SPEED, GS } from './constants.js';

/* ── player arrow ── */

/**
 * Creates a player arrow flying toward (tx, ty) from (px, py).
 */
export function createArrow(world, px, py, tx, ty, angleOffset = 0, chainData = null) {
    const c = new Container();
    c.x = px;
    c.y = py;

    const dx = tx - px;
    const dy = ty - py;

    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    const spd = ARROW_SPEED * GS;

    const angle = Math.atan2(dy, dx) + angleOffset;

    const trail = new Graphics();
    trail.rect(-14, -1.5, 14, 3).fill({ color: 0x9b59b6, alpha: 0.32 });
    c.addChild(trail);

    const shaft = new Graphics();
    shaft.rect(-2, -1, 14, 2).fill(0xe8d5b7);
    c.addChild(shaft);

    const tip = new Graphics();
    tip.moveTo(12, 0).lineTo(6, -3).lineTo(6, 3).closePath().fill(0xb5e8ff);
    c.addChild(tip);

    c.rotation = angle;

    world.addChild(c);

    return {
        c,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 140,
        // Chain properties
        chainRemaining: chainData?.chainRemaining ?? 0,
        chainHitMobs: chainData?.chainHitMobs ?? new Set(),
        damage: chainData?.damage ?? 0
    };
}

/* ── enemy projectile ── */

/**
 * Creates an enemy orb fired toward the player position (px, py).
 */
export function createEnemyProj(world, ex, ey, px, py, type, dmg, spd = 2.8, size = 9, angleOffset = 0) {
    const c = new Container();
    c.x = ex; c.y = ey;

    const GLOW = {
        desert: 0xff8800,
        ice:    0x88eeff,
        lava:   0xff2200,
        forest: 0x44ff66,
    };

    const dx = px - ex, dy = py - ey;
    const d  = Math.sqrt(dx * dx + dy * dy);
    const col = GLOW[type];

    const gl = new Graphics();
    gl.circle(0, 0, size + 7).fill({ color: col, alpha: 0.22 });
    c.addChild(gl);

    const orb = new Graphics();
    orb.circle(0, 0, size).fill({ color: col, alpha: 0.9 });
    orb.circle(-3, -3, size * 0.4).fill({ color: 0xffffff, alpha: 0.3 });
    c.addChild(orb);

    world.addChild(c);

    const baseAngle = Math.atan2(dy, dx) + angleOffset;
    const sv = spd * GS;

    return {
        c,
        vx: Math.cos(baseAngle) * sv,
        vy: Math.sin(baseAngle) * sv,
        life: 240,
        dmg,
        type,
    };
}