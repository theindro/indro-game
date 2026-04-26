// Fireball.js - Player Fireball Projectile
import { Container, Graphics } from 'pixi.js';
import { ARROW_SPEED, GS } from '../constants.js';

export function createFireball(world, px, py, tx, ty, angleOffset = 0) {
    const c = new Container();
    c.x = px;
    c.y = py;

    const dx = tx - px;
    const dy = ty - py;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = ARROW_SPEED * GS;
    const angle = Math.atan2(dy, dx) + angleOffset;

    // Fireball glow (outer)
    const outerGlow = new Graphics();
    outerGlow.circle(0, 0, 12).fill({ color: 0xff3300, alpha: 0.3 });
    c.addChild(outerGlow);

    // Fireball glow (inner)
    const innerGlow = new Graphics();
    innerGlow.circle(0, 0, 8).fill({ color: 0xff6600, alpha: 0.5 });
    c.addChild(innerGlow);

    // Main fireball body
    const body = new Graphics();
    body.circle(0, 0, 7).fill(0xff4400);
    body.circle(-2, -1, 5).fill(0xff6600);
    body.circle(1, 1, 4).fill(0xff3300);
    body.circle(0, 0, 3).fill(0xffaa00);
    body.circle(0, 0, 1).fill(0xffffff);
    c.addChild(body);

    // Flame trail (particles that follow)
    const trail = new Graphics();
    trail.ellipse(-12, 0, 8, 3).fill({ color: 0xff6600, alpha: 0.4 });
    c.addChild(trail);

    // Smaller flame flickers
    const flickers = [];
    for (let i = 0; i < 3; i++) {
        const flicker = new Graphics();
        const offset = -10 - i * 3;
        flicker.circle(offset, 0, 2 + i).fill({ color: 0xff8800, alpha: 0.5 });
        c.addChild(flicker);
        flickers.push(flicker);
    }

    c.rotation = angle;

    world.addChild(c);

    // Animation data
    let life = 140;
    let time = 0;

    return {
        c,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        damage: 0, // Will be set by game
        update() {
            time++;
            // Animate fireball
            const pulse = 0.7 + Math.sin(time * 0.3) * 0.3;
            body.scale.set(pulse, pulse);

            // Animate glow
            outerGlow.alpha = 0.2 + Math.sin(time * 0.5) * 0.15;
            innerGlow.alpha = 0.4 + Math.sin(time * 0.4) * 0.2;

            // Animate flickers
            flickers.forEach((flicker, i) => {
                flicker.alpha = 0.3 + Math.sin(time * 0.6 + i) * 0.3;
                flicker.x = -10 - i * 3 + Math.sin(time * 0.8 + i) * 2;
            });

            // Trail animation
            trail.scale.set(1 + Math.sin(time * 0.7) * 0.2, 1);
            trail.alpha = 0.3 + Math.sin(time * 0.5) * 0.15;
        }
    };
}