import { Graphics } from 'pixi.js';
import { GROUND_ATTACK_Y_SQUASH } from './createGroundAttackController.js';
import { getAbilityCastSpec, PREVIEW_COLOR, PREVIEW_ACCENT } from '../abilities/abilityCastSpecs.js';
import { resolveAbilityCastTarget } from '../abilities/abilityTargeting.js';

const PREVIEW_Z = 900_000;

/**
 * @param {Graphics} gfx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} color
 * @param {number} width
 * @param {number} alpha
 */
function strokeGroundEllipseAt(gfx, cx, cy, radius, color, width, alpha) {
    gfx.ellipse(cx, cy, radius, radius * GROUND_ATTACK_Y_SQUASH)
        .stroke({ color, width, alpha });
}

/**
 * @param {Graphics} gfx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} color
 * @param {number} alpha
 */
function fillGroundEllipseAt(gfx, cx, cy, radius, color, alpha) {
    gfx.ellipse(cx, cy, radius, radius * GROUND_ATTACK_Y_SQUASH)
        .fill({ color, alpha });
}

/**
 * @param {import('pixi.js').Container} layer
 */
export function createAbilityCastPreview(layer) {
    const root = new Graphics();
    root.zIndex = PREVIEW_Z;
    root.eventMode = 'none';
    root.position.set(0, 0);
    layer.addChild(root);

    /**
     * @param {string} abilityKey
     * @param {number} px
     * @param {number} py
     * @param {number} cursorX
     * @param {number} cursorY
     * @param {object} ability
     * @param {{ openWorld?: object, colliders?: object[] }} ctx
     */
    function draw(abilityKey, px, py, cursorX, cursorY, ability, ctx) {
        root.clear();

        const spec = getAbilityCastSpec(abilityKey);
        const color = PREVIEW_COLOR;
        const accent = PREVIEW_ACCENT;
        const strokeW = spec.strokeWidth ?? 2.5;
        const fillAlpha = spec.fillAlpha ?? 0.14;

        const target = resolveAbilityCastTarget(abilityKey, px, py, cursorX, cursorY, ability, ctx);
        const tx = target.x;
        const ty = target.y;

        if (!spec.hideOrigin) {
            drawOriginMarker(root, px, py, color, accent);
        }

        if (spec.mode === 'self') {
            const r = spec.selfRadius ?? 80;
            strokeGroundEllipseAt(root, px, py, r, color, strokeW + 0.5, 0.9);
            fillGroundEllipseAt(root, px, py, r * 0.55, color, fillAlpha * 1.3);
            return;
        }

        if (spec.mode === 'ground') {
            const radius = ability.explosionRadius ?? 130;

            if (spec.useLeapRange) {
                root.moveTo(px, py);
                root.lineTo(tx, ty);
                root.stroke({
                    color,
                    width: 2,
                    alpha: 0.6,
                });
            }

            strokeGroundEllipseAt(root, tx, ty, radius, color, strokeW + 1, 0.95);
            fillGroundEllipseAt(root, tx, ty, radius * 0.92, color, fillAlpha);
            root.circle(tx, ty, 8).fill({ color: accent, alpha: 0.7 });
            return;
        }

        // direction — all vectors originate from the player
        const angle = Math.atan2(cursorY - py, cursorX - px);
        const dist = Math.min(Math.hypot(cursorX - px, cursorY - py), 520);
        const endX = px + Math.cos(angle) * dist;
        const endY = py + Math.sin(angle) * dist;

        root.moveTo(px, py);
        root.lineTo(endX, endY);
        root.stroke({ color, width: strokeW, alpha: 0.8 });

        const spread = spec.coneSpread ?? 0.12;
        const count = spec.coneCount ?? 6;
        const coneLen = Math.min(dist, 280);

        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * spread;
            const a = angle + offset;
            root.moveTo(px, py);
            root.lineTo(px + Math.cos(a) * coneLen, py + Math.sin(a) * coneLen);
            root.stroke({ color, width: 1.5, alpha: 0.38 });
        }

        if (spec.useAbilityRadius) {
            const impactDist = Math.min(dist, 360);
            const ix = px + Math.cos(angle) * impactDist;
            const iy = py + Math.sin(angle) * impactDist;
            const endR = ability.explosionRadius ?? 120;
            strokeGroundEllipseAt(root, ix, iy, endR, accent, strokeW, 0.75);
            fillGroundEllipseAt(root, ix, iy, endR * 0.9, accent, fillAlpha);
        } else {
            root.circle(endX, endY, 7).fill({ color: accent, alpha: 0.75 });
            root.circle(endX, endY, 7).stroke({ color, width: 1.5, alpha: 0.9 });
        }
    }

    function clear() {
        root.clear();
    }

    function destroy() {
        clear();
        root.destroy();
    }

    return { draw, clear, destroy, root };
}

/**
 * @param {Graphics} gfx
 * @param {number} px
 * @param {number} py
 * @param {number} color
 * @param {number} accent
 */
function drawOriginMarker(gfx, px, py, color, accent) {
    gfx.circle(px, py, 14).stroke({ color, width: 2.5, alpha: 0.85 });
    gfx.circle(px, py, 6).fill({ color: accent, alpha: 0.55 });
}
