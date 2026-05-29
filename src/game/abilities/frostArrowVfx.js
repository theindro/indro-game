import { Graphics } from 'pixi.js';
import { VFX } from '../GlobalEffects.js';
import {
    GroundAttackController,
    GROUND_ATTACK_Y_SQUASH,
} from '../controllers/createGroundAttackController.js';
import { GROUND_IMPACT_TICKS, GROUND_WARN_INSTANT } from '../constants.js';

const FROST_PRIMARY = 0x5599ee;
const FROST_WARNING = 0x88ccff;
const FROST_INNER = 0xddf8ff;

/** @type {GroundAttackController | null} */
let activeFrostController = null;

/** Tick in main game loop while frost ground VFX are active. */
export function tickFrostGroundAttacks(playerX, playerY, dt) {
    if (!activeFrostController?.active) return;

    activeFrostController.update(playerX, playerY, null, dt);

    if (activeFrostController.attacks.length === 0) {
        activeFrostController.clear();
        activeFrostController = null;
    }
}

/**
 * @param {import('pixi.js').Container} entityLayer
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 */
function spawnFrostShockwaveRings(entityLayer, x, y, radius) {
    if (!entityLayer) return;

    const R = Math.max(70, radius);

    const innerRing = new Graphics();
    innerRing.ellipse(0, 0, R, R * GROUND_ATTACK_Y_SQUASH)
        .stroke({ color: FROST_INNER, width: 4, alpha: 0.9 });
    innerRing.x = x;
    innerRing.y = y;
    innerRing.zIndex = y + 1;
    entityLayer.addChild(innerRing);

    let scale = 0.4;
    let alpha = 1;
    let last = performance.now();

    const animateInner = (now) => {
        if (innerRing.destroyed) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        scale += 9 * dt;
        alpha -= 3 * dt;
        innerRing.scale.set(scale);
        innerRing.alpha = Math.max(0, alpha);
        if (alpha <= 0) {
            entityLayer.removeChild(innerRing);
            innerRing.destroy();
        } else {
            requestAnimationFrame(animateInner);
        }
    };
    requestAnimationFrame(animateInner);

    const outerRing = new Graphics();
    outerRing.ellipse(0, 0, R * 1.12, R * 1.12 * GROUND_ATTACK_Y_SQUASH)
        .stroke({ color: FROST_PRIMARY, width: 3, alpha: 0.55 });
    outerRing.x = x;
    outerRing.y = y;
    outerRing.zIndex = y;
    entityLayer.addChild(outerRing);

    let scale2 = 0.25;
    let alpha2 = 0.85;
    let last2 = performance.now();

    const animateOuter = (now) => {
        if (outerRing.destroyed) return;
        const dt = Math.min((now - last2) / 1000, 0.05);
        last2 = now;
        scale2 += 10 * dt;
        alpha2 -= 2.6 * dt;
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
}

/**
 * Skewed ground-attack impact (GroundAttackController) + frost burst VFX.
 * @param {import('pixi.js').Container} entityLayer
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {() => void} [onImpact]
 */
export function spawnFrostExplosionGroundAttack(entityLayer, x, y, radius, onImpact) {
    if (!entityLayer) return;

    if (!activeFrostController?.active) {
        activeFrostController = new GroundAttackController(entityLayer);
    }

    const impactRadius = Math.max(60, radius);

    activeFrostController.addAttack(x, y, {
        shape: 'circle',
        radius: impactRadius,
        warningDuration: GROUND_WARN_INSTANT,
        impactDuration: GROUND_IMPACT_TICKS,
        color: FROST_PRIMARY,
        warningColor: FROST_WARNING,
        innerColor: FROST_INNER,
        damage: 0,
        onImpact: (ix, iy) => {
            VFX.burst(ix, iy, FROST_PRIMARY);
            VFX.burst(ix, iy, FROST_INNER);
            VFX.playZapImpact(ix, iy, 1.0);
            VFX.explosion(ix, iy, FROST_PRIMARY, 0.5, impactRadius * 0.35);
            spawnFrostShockwaveRings(entityLayer, ix, iy, impactRadius);
            onImpact?.();
        },
    });

    activeFrostController.addAttack(x, y, {
        shape: 'circle',
        radius: impactRadius * 1.05,
        warningDuration: GROUND_WARN_INSTANT + 3,
        impactDuration: GROUND_IMPACT_TICKS + 5,
        color: 0x4488dd,
        warningColor: 0xaaddff,
        innerColor: 0xeeffff,
        damage: 0,
        onImpact: (ix, iy) => {
            VFX.burst(ix, iy, FROST_WARNING);
        },
    });
}
