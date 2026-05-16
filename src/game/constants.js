/** Legacy tuning in "per 1/60s step" units: multiply velocities by this each tick (dt = seconds). */
export function frameScale(dtSec) {
    return dtSec * 60;
}

// ── Player
export const PLAYER_SPEED = 3;
export const PLAYER_RADIUS = 16;
export const GS = 0.65; // global speed scalar

// ── Mobs
export const MOB_RADIUS = 13;
export const MOB_HP = 60;
/** Walk speed scale before archetype `speedMultiplier`; world speed ≈ `MOB_BASE_SPEED_SCALE × speedMult × 60` px/s (chase vectors are unit length). */
export const MOB_BASE_SPEED_SCALE = 2.45;

// ── Boss
export const BOSS_RADIUS = 36;
export const BOSS_HP = 2500;
/** Same displacement convention as mobs (`× frameScale(dt)`); ≈ `BOSS_SPEED × 60` px/s toward player. */
export const BOSS_SPEED = 1.12;
export const BOSS_SHOOT_INTERVAL = 60;

// ── Projectiles
/** Player arrow base speed scale; effective px/s ≈ `ARROW_SPEED × stats.projectileSpeed × 60` (travel ends at `stats.attackRange`). */
export const ARROW_SPEED = 16.2;
/** Default max travel distance (px) from spawn when stats omit `attackRange`. */
export const DEFAULT_ATTACK_RANGE = 520;

/**
 * Ground attack timers are stored as “60fps frame units” (duration in seconds = value / 60).
 * Used for telegraph + impact polish so high refresh rates stay time-correct.
 */
export const GROUND_WARN_INSTANT = 4;
export const GROUND_WARN_FAST = 28;
export const GROUND_WARN_NORMAL = 38;
export const GROUND_WARN_SLOW = 48;
export const GROUND_IMPACT_TICKS = 22;
/** Passed to createEnemyProj as `spd`; velocity px/s = spd * 60 (same convention as boss orbs). */
export const ENEMY_RANGED_ORB_SPEED_SCALE = 4.2;
export const ICE_MOB_SHOOT_INTERVAL_BASE = 140;

// ── XP
export const XP_PER_MOB = 25;
export const XP_PER_BOSS = 250;
export const XP_PER_DROP_XP = 12;
export const XP_PER_DROP_LOOT = 6;
export const XP_NEXT_MULTIPLIER = 1.35;
export const HP_PER_LEVEL = 25;

export const HEART_COLOR = 0xff2255;

// Add to constants.js
export const ARROW_CONFIG = {
    DEFAULT_CHAIN_RANGE: 350,
    BOSS_BASE_DAMAGE: 18,
    COLLISION_RADIUS: 16,
    ARROW_RADIUS: 4
};

// ── Camera
export const CAM_SMOOTH = 0.09;

// ── Biome colours
export const BIOME_COLORS = {
    forest: {
        base: '#a9cb30',
        accent: 0x1a4a22,
        glow: 0xffaa44,
        props: true,
        tint: '',
        texture: "/testgrass.jpg",
    },
    desert: {
        base: '#855655',
        accent: 0xd4a055,
        glow: 0xe8a050,
        tint: 0xddbb88,
        props: false,
        texture: "/testgrass.jpg"
    },
    ice: {
        base: '#c9e2ff',
        accent: 0xb8e4f4,
        glow: 0x88ccff,
        tint: 0xcceeff,
        props: false,
        texture: "/testgrass3.jpg"
    },
    lava: {
        base: '#262626',
        accent: 0xcc3300,
        glow: 0xff4400,
        magma: 0xff6600,
        obsidian: 0x1a0a0a,
        props: true,
        texture: "/testgrass.jpg"
    },
};

export const DIFFICULTY = {
    mobHp: 1,
    mobSpeed: 0.2,
    attackCooldown: 0.7,
};
