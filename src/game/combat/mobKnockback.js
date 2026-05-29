import { frameScale, MOB_RADIUS } from '../constants.js';
import { resolveVsColliders } from '../world/collision.js';

/** Impulse added per arrow hit (px/s-ish, decayed each frame). */
const ARROW_KB_IMPULSE = 13;
const ARROW_KB_MAX_SPEED = 52;
const ARROW_STAGGER_MS = 95;
const ELITE_KB_MUL = 0.5;
const ELITE_STAGGER_MUL = 0.72;

/**
 * @param {object} mob
 * @param {{ c: { x: number, y: number }, vx?: number, vy?: number }} arrow
 * @param {number} [damage]
 */
export function applyArrowHitKnockback(mob, arrow, damage = 0) {
    if (!mob || mob.hp <= 0) return;

    let dirX = arrow.vx ?? 0;
    let dirY = arrow.vy ?? 0;
    const travelLen = Math.hypot(dirX, dirY);
    if (travelLen > 0.01) {
        dirX /= travelLen;
        dirY /= travelLen;
    } else {
        const awayX = mob.x - arrow.c.x;
        const awayY = mob.y - arrow.c.y;
        const awayLen = Math.hypot(awayX, awayY) || 1;
        dirX = awayX / awayLen;
        dirY = awayY / awayLen;
    }

    const awayX = mob.x - arrow.c.x;
    const awayY = mob.y - arrow.c.y;
    const awayLen = Math.hypot(awayX, awayY) || 1;
    const blend = 0.62;
    let pushX = dirX * blend + (awayX / awayLen) * (1 - blend);
    let pushY = dirY * blend + (awayY / awayLen) * (1 - blend);
    const pushLen = Math.hypot(pushX, pushY) || 1;
    pushX /= pushLen;
    pushY /= pushLen;

    const dmgMul = Math.min(1.3, 1 + damage * 0.012);
    const eliteMul = mob.isElite ? ELITE_KB_MUL : 1;
    const impulse = ARROW_KB_IMPULSE * dmgMul * eliteMul;

    let vx = (mob._knockbackVx ?? 0) + pushX * impulse;
    let vy = (mob._knockbackVy ?? 0) + pushY * impulse;
    const speed = Math.hypot(vx, vy);
    if (speed > ARROW_KB_MAX_SPEED) {
        vx = (vx / speed) * ARROW_KB_MAX_SPEED;
        vy = (vy / speed) * ARROW_KB_MAX_SPEED;
    }
    mob._knockbackVx = vx;
    mob._knockbackVy = vy;

    const staggerMs = ARROW_STAGGER_MS * (mob.isElite ? ELITE_STAGGER_MUL : 1);
    mob._staggerUntil = Math.max(mob._staggerUntil ?? 0, performance.now() + staggerMs);
    mob._hitSquash = Math.min(1, (mob._hitSquash ?? 0) + 0.55);
}

/**
 * Integrate knockback velocity and decay (call once per mob update before AI move).
 * @param {object} mob
 * @param {number} dt seconds
 * @param {{ colliders?: object[], openWorld?: { getCurrentBounds?: () => object }, mobs?: object[] }} ctx
 */
export function tickMobKnockback(mob, dt, ctx = {}) {
    let vx = mob._knockbackVx ?? 0;
    let vy = mob._knockbackVy ?? 0;
    if (Math.abs(vx) < 0.35 && Math.abs(vy) < 0.35) {
        mob._knockbackVx = 0;
        mob._knockbackVy = 0;
        return;
    }

    const fs = frameScale(dt);
    const decay = Math.pow(0.8, fs);
    vx *= decay;
    vy *= decay;

    let newX = mob.x + vx * fs;
    let newY = mob.y + vy * fs;

    const { colliders, openWorld, mobs } = ctx;
    const radius = MOB_RADIUS;

    if (openWorld?.getCurrentBounds) {
        const bounds = openWorld.getCurrentBounds();
        if (bounds) {
            newX = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, newX));
            newY = Math.max(bounds.minY + radius, Math.min(bounds.maxY - radius, newY));
        }
    }

    if (mobs?.length) {
        for (const other of mobs) {
            if (other === mob || other.hp <= 0) continue;
            const dist = Math.hypot(newX - other.x, newY - other.y);
            if (dist < radius * 2 && dist > 0.01) {
                const angle = Math.atan2(newY - other.y, newX - other.x);
                newX = other.x + Math.cos(angle) * radius * 2;
                newY = other.y + Math.sin(angle) * radius * 2;
            }
        }
    }

    if (colliders?.length) {
        const valid = colliders.filter((c) => c?.collision && c.width && c.height);
        if (valid.length) {
            const resolved = resolveVsColliders(newX, newY, radius, valid);
            newX = resolved.x;
            newY = resolved.y;
        }
    }

    mob.x = newX;
    mob.y = newY;
    if (mob.c) {
        mob.c.x = newX;
        mob.c.y = newY;
    }

    mob._knockbackVx = vx;
    mob._knockbackVy = vy;
}

/** 0–1 multiplier on AI chase/patrol velocity while recovering from arrow hit. */
export function getMobStaggerMoveMul(mob) {
    const until = mob._staggerUntil ?? 0;
    const now = performance.now();
    if (now >= until) return 1;

    const remaining = until - now;
    const total = ARROW_STAGGER_MS * (mob.isElite ? ELITE_STAGGER_MUL : 1);
    const t = remaining / Math.max(total, 1);

    if (t > 0.55) return 0.06;
    if (t > 0.3) return 0.28;
    return 0.55 + (1 - t) * 0.4;
}
