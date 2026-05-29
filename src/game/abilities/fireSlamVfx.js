import { Graphics } from 'pixi.js';
import { VFX } from '../GlobalEffects.js';
import {
    GroundAttackController,
} from '../controllers/createGroundAttackController.js';
import { GROUND_IMPACT_TICKS, GROUND_WARN_INSTANT } from '../constants.js';

const FIRE_PRIMARY = 0xff5500;
const FIRE_WARNING = 0xff9922;
const FIRE_INNER = 0xffee88;

/** @type {GroundAttackController | null} */
let activeSlamController = null;

/** Tick in main game loop while fire-slam ground VFX are active. */
export function tickFireSlamGroundAttacks(playerX, playerY, dt) {
    if (!activeSlamController?.active) return;

    activeSlamController.update(playerX, playerY, null, dt);

    if (activeSlamController.attacks.length === 0) {
        activeSlamController.clear();
        activeSlamController = null;
    }
}

/**
 * @param {import('pixi.js').Container} entityLayer
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {() => void} [onImpact]
 */
export function spawnFireSlamGroundAttack(entityLayer, x, y, radius, onImpact) {
    if (!entityLayer) return;

    if (!activeSlamController?.active) {
        activeSlamController = new GroundAttackController(entityLayer);
    }

    const impactRadius = Math.max(70, radius);

    activeSlamController.addAttack(x, y, {
        shape: 'circle',
        radius: impactRadius * 0.55,
        warningDuration: GROUND_WARN_INSTANT,
        impactDuration: GROUND_IMPACT_TICKS,
        color: FIRE_PRIMARY,
        warningColor: FIRE_WARNING,
        innerColor: FIRE_INNER,
        damage: 0,
        onImpact: (ix, iy) => {
            VFX.burst(ix, iy, FIRE_PRIMARY);
            VFX.burst(ix, iy, FIRE_INNER);
            VFX.playZapImpact(ix, iy, 1.05);
            VFX.explosion(ix, iy, FIRE_PRIMARY, 0.55, impactRadius * 0.35);
            for (let i = 0; i < 10; i++) {
                VFX.ember(ix + (Math.random() - 0.5) * 40, iy + (Math.random() - 0.5) * 20);
            }
            onImpact?.(ix, iy);
        },
    });

    activeSlamController.addAttack(x, y, {
        shape: 'circle',
        radius: impactRadius,
        warningDuration: GROUND_WARN_INSTANT + 4,
        impactDuration: GROUND_IMPACT_TICKS + 6,
        color: 0xff3300,
        warningColor: 0xff7700,
        innerColor: 0xffcc44,
        damage: 0,
        onImpact: (ix, iy) => {
            VFX.burst(ix, iy, 0xff4400);
        },
    });
}

/**
 * Expanding fire shockwave rings + scorch pool (Frost Arrow–style extras).
 * @param {import('pixi.js').Container} entityLayer
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 */
export function spawnFireShockwaveAndScorch(entityLayer, x, y, radius) {
    if (!entityLayer) return;

    const R = Math.max(80, radius);

    const shockRing = new Graphics();
    shockRing.circle(0, 0, R).stroke({ color: FIRE_INNER, width: 5, alpha: 0.9 });
    shockRing.x = x;
    shockRing.y = y;
    shockRing.zIndex = y + 1;
    entityLayer.addChild(shockRing);

    let scale = 0.35;
    let alpha = 1;
    let last = performance.now();

    const animateRing = (now) => {
        if (shockRing.destroyed) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        scale += 10 * dt;
        alpha -= 3.2 * dt;
        shockRing.scale.set(scale);
        shockRing.alpha = Math.max(0, alpha);
        if (alpha <= 0) {
            entityLayer.removeChild(shockRing);
            shockRing.destroy();
        } else {
            requestAnimationFrame(animateRing);
        }
    };
    requestAnimationFrame(animateRing);

    const outerRing = new Graphics();
    outerRing.circle(0, 0, R * 1.15).stroke({ color: FIRE_PRIMARY, width: 3, alpha: 0.55 });
    outerRing.x = x;
    outerRing.y = y;
    outerRing.zIndex = y;
    entityLayer.addChild(outerRing);

    let scale2 = 0.2;
    let alpha2 = 0.85;
    let last2 = performance.now();

    const animateOuter = (now) => {
        if (outerRing.destroyed) return;
        const dt = Math.min((now - last2) / 1000, 0.05);
        last2 = now;
        scale2 += 11 * dt;
        alpha2 -= 2.8 * dt;
        outerRing.scale.set(scale2);
        outerRing.alpha = Math.max(0, alpha2);
        if (alpha2 <= 0) {
            entityLayer.removeChild(outerRing);
            outerRing.destroy();
        } else {
            requestAnimationFrame(animateOuter);
        }
    };
    requestAnimationFrame(animateOuter);

    const scorch = new Graphics();
    scorch.circle(0, 0, R * 0.92).fill({ color: FIRE_PRIMARY, alpha: 0.22 });
    scorch.circle(0, 0, R * 0.5).fill({ color: FIRE_INNER, alpha: 0.12 });
    scorch.x = x;
    scorch.y = y;
    scorch.zIndex = y - 1;
    entityLayer.addChild(scorch);

    VFX.addGlow(0, 0, {
        color: FIRE_PRIMARY,
        alpha: 0.32,
        scale: Math.max(1.6, R / 85),
        texture: 'glow2',
    }, scorch);

    let fade = 1;
    let fadeLast = performance.now();

    const fadeScorch = (now) => {
        if (scorch.destroyed) return;
        const dt = Math.min((now - fadeLast) / 1000, 0.05);
        fadeLast = now;
        fade -= 1.4 * dt;
        scorch.alpha = fade * 0.85;
        if (fade <= 0) {
            entityLayer.removeChild(scorch);
            scorch.destroy({ children: true });
        } else {
            requestAnimationFrame(fadeScorch);
        }
    };
    requestAnimationFrame(fadeScorch);

    for (let i = 0; i < 10; i++) {
        const spikeAngle = (i / 10) * Math.PI * 2;
        const spike = new Graphics();
        spike.moveTo(x, y);
        spike.lineTo(
            x + Math.cos(spikeAngle) * R * 1.05,
            y + Math.sin(spikeAngle) * R * 1.05
        );
        spike.stroke({ color: FIRE_WARNING, width: 2, alpha: 0.35 });
        spike.zIndex = y;
        entityLayer.addChild(spike);
        setTimeout(() => {
            if (spike && !spike.destroyed) {
                entityLayer.removeChild(spike);
                spike.destroy();
            }
        }, 280);
    }
}
