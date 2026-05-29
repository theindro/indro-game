import { Graphics } from 'pixi.js';
import { VFX } from '../GlobalEffects.js';
import {
    GroundAttackController,
    GROUND_ATTACK_Y_SQUASH,
} from '../controllers/createGroundAttackController.js';
import { GROUND_IMPACT_TICKS, GROUND_WARN_INSTANT } from '../constants.js';

const VENOM_PRIMARY = 0x33bb44;
const VENOM_WARNING = 0x66ee66;
const VENOM_INNER = 0xccffaa;

/** @type {GroundAttackController | null} */
let activeVenomController = null;

/** Tick in main game loop while venom ground VFX are active. */
export function tickVenomGroundAttacks(playerX, playerY, dt) {
    if (!activeVenomController?.active) return;

    activeVenomController.update(playerX, playerY, null, dt);

    if (activeVenomController.attacks.length === 0) {
        activeVenomController.clear();
        activeVenomController = null;
    }
}

/**
 * @param {import('pixi.js').Container} entityLayer
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 */
function spawnVenomShockwaveRings(entityLayer, x, y, radius) {
    if (!entityLayer) return;

    const R = Math.max(70, radius);

    const innerRing = new Graphics();
    innerRing.ellipse(0, 0, R, R * GROUND_ATTACK_Y_SQUASH)
        .stroke({ color: VENOM_INNER, width: 4, alpha: 0.9 });
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
        .stroke({ color: VENOM_PRIMARY, width: 3, alpha: 0.55 });
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

    const pool = new Graphics();
    pool.ellipse(0, 0, R * 0.92, R * 0.92 * GROUND_ATTACK_Y_SQUASH)
        .fill({ color: VENOM_PRIMARY, alpha: 0.2 });
    pool.ellipse(0, 0, R * 0.5, R * 0.5 * GROUND_ATTACK_Y_SQUASH)
        .fill({ color: VENOM_INNER, alpha: 0.1 });
    pool.x = x;
    pool.y = y;
    pool.zIndex = y - 1;
    entityLayer.addChild(pool);

    VFX.addGlow(0, 0, {
        color: VENOM_PRIMARY,
        alpha: 0.28,
        scale: Math.max(1.5, R / 85),
        texture: 'glow2',
    }, pool);

    let fade = 1;
    let fadeLast = performance.now();

    const fadePool = (now) => {
        if (pool.destroyed) return;
        const dt = Math.min((now - fadeLast) / 1000, 0.05);
        fadeLast = now;
        fade -= 1.3 * dt;
        pool.alpha = fade * 0.85;
        if (fade <= 0) {
            entityLayer.removeChild(pool);
            pool.destroy({ children: true });
        } else {
            requestAnimationFrame(fadePool);
        }
    };
    requestAnimationFrame(fadePool);
}

/**
 * @param {import('pixi.js').Container} entityLayer
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {() => void} [onImpact]
 */
export function spawnVenomNovaGroundAttack(entityLayer, x, y, radius, onImpact) {
    if (!entityLayer) return;

    if (!activeVenomController?.active) {
        activeVenomController = new GroundAttackController(entityLayer);
    }

    const impactRadius = Math.max(60, radius);

    activeVenomController.addAttack(x, y, {
        shape: 'circle',
        radius: impactRadius,
        warningDuration: GROUND_WARN_INSTANT,
        impactDuration: GROUND_IMPACT_TICKS,
        color: VENOM_PRIMARY,
        warningColor: VENOM_WARNING,
        innerColor: VENOM_INNER,
        damage: 0,
        onImpact: (ix, iy) => {
            VFX.burst(ix, iy, VENOM_PRIMARY);
            VFX.burst(ix, iy, VENOM_INNER);
            VFX.playZapImpact(ix, iy, 1.0);
            VFX.explosion(ix, iy, VENOM_PRIMARY, 0.5, impactRadius * 0.35);
            spawnVenomShockwaveRings(entityLayer, ix, iy, impactRadius);
            for (let i = 0; i < 8; i++) {
                VFX.burst(
                    ix + (Math.random() - 0.5) * impactRadius * 0.5,
                    iy + (Math.random() - 0.5) * impactRadius * 0.3,
                    VENOM_WARNING
                );
            }
            onImpact?.();
        },
    });

    activeVenomController.addAttack(x, y, {
        shape: 'circle',
        radius: impactRadius * 1.05,
        warningDuration: GROUND_WARN_INSTANT + 3,
        impactDuration: GROUND_IMPACT_TICKS + 5,
        color: 0x228833,
        warningColor: 0x55dd66,
        innerColor: 0xaaff88,
        damage: 0,
        onImpact: (ix, iy) => {
            VFX.burst(ix, iy, VENOM_WARNING);
        },
    });
}
