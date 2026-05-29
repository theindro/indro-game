/**
 * Procedural blob squash/stretch for the player `visual` container.
 * Pivot should sit near the feet (see createPlayerEntity).
 */

const VISUAL_FOOT_PIVOT_Y = 15;

export function createPlayerAnimationState() {
    return {
        attackAnim: 0,
        hitAnim: 0,
        dashPulse: 0,
    };
}

/**
 * @param {ReturnType<typeof createPlayerAnimationState>} state
 * @param {number} dt seconds
 * @param {{
 *   bobT: number,
 *   moving: boolean,
 *   dashing: boolean,
 *   speed: number,
 *   moveDirX: number,
 *   moveDirY: number,
 *   aimX: number,
 *   aimY: number,
 * }} opts
 */
export function tickPlayerBodyAnimation(state, dt, opts) {
    const fs = Math.min(dt * 60, 3);
    const {
        bobT,
        moving,
        dashing,
        speed = 0,
        moveDirX = 0,
        moveDirY = -1,
        aimX = 1,
        aimY = 0,
    } = opts;

    state.attackAnim = Math.max(0, state.attackAnim - 0.22 * fs);
    state.hitAnim = Math.max(0, state.hitAnim - 0.16 * fs);
    state.dashPulse = Math.max(0, state.dashPulse - 0.12 * fs);

    let scaleX = 1;
    let scaleY = 1;
    let offsetY = 0;
    let rotation = 0;
    let skewX = 0;

    const moveMag = Math.hypot(moveDirX, moveDirY) || 1;
    const ndx = moveDirX / moveMag;
    const ndy = moveDirY / moveMag;
    const aimMag = Math.hypot(aimX, aimY) || 1;
    const ax = aimX / aimMag;
    const ay = aimY / aimMag;

    // Idle breathe
    if (!moving && !dashing) {
        const breathe = Math.sin(bobT * 1.15);
        scaleY += breathe * 0.045;
        scaleX -= breathe * 0.022;
        offsetY += breathe * 0.35;
    }

    // Walk/run squash — jelly blob steps
    if (moving && !dashing) {
        const step = Math.sin(bobT * 2.1);
        const intensity = Math.min(1, speed / 140);
        const squash = step * 0.14 * intensity;
        scaleY -= squash;
        scaleX += squash * 0.85;
        offsetY -= Math.max(0, -step) * 1.8 * intensity;
        rotation += ndx * 0.06 * intensity;
        skewX += ndx * 0.04 * intensity;
    }

    // Dash stretch along movement
    if (dashing) {
        state.dashPulse = Math.max(state.dashPulse, 1);
        const stretch = 0.28 + state.dashPulse * 0.08;
        scaleX += stretch * Math.abs(ndx) + stretch * 0.35;
        scaleY -= stretch * 0.45;
        offsetY += 2;
        rotation += ndx * 0.12;
    }

    // Attack punch — squash down, lean toward aim
    if (state.attackAnim > 0) {
        const a = state.attackAnim;
        const punch = a * a;
        scaleX += punch * 0.2;
        scaleY -= punch * 0.16;
        offsetY += punch * 2.5;
        rotation += ax * 0.08 * punch;
        skewX += ax * 0.05 * punch;
    }

    // Hit flinch — brief squish + wobble
    if (state.hitAnim > 0) {
        const h = state.hitAnim;
        const wobble = Math.sin(h * 22) * h * 0.08;
        scaleX += h * 0.18 + wobble;
        scaleY -= h * 0.22;
        offsetY += h * 1.5;
        rotation += wobble * 2;
    }

    const shadowScaleX = 1 + (1 - scaleY) * 0.45 + (scaleX - 1) * 0.25;
    const shadowScaleY = 1 - (1 - scaleY) * 0.35;
    const shadowAlpha = moving ? 0.11 : 0.09;

    return {
        scaleX,
        scaleY,
        offsetY,
        rotation,
        skewX,
        shadowScaleX,
        shadowScaleY,
        shadowAlpha,
        footPivotY: VISUAL_FOOT_PIVOT_Y,
    };
}

export function triggerPlayerAttackAnim(state, strength = 1) {
    state.attackAnim = Math.max(state.attackAnim, strength);
}

export function triggerPlayerHitAnim(state, strength = 1) {
    state.hitAnim = Math.max(state.hitAnim, strength);
}

export function triggerPlayerDashAnim(state) {
    state.dashPulse = 1;
}
