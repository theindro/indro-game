// ── Player
export const PLAYER_SPEED = 3;
export const PLAYER_RADIUS = 16;
export const GS = 0.65; // global speed scalar

// ── Mobs
export const MOB_RADIUS = 13;
export const MOB_HP = 60;

// ── Boss
export const BOSS_RADIUS = 36;
export const BOSS_HP = 2500;
export const BOSS_SPEED = 0.48;
export const BOSS_SHOOT_INTERVAL = 250;

// ── Projectiles
export const ARROW_SPEED = 6;
export const ICE_MOB_SHOOT_INTERVAL_BASE = 140;

// ── XP
export const XP_PER_MOB = 25;
export const XP_PER_BOSS = 250;
export const XP_PER_DROP_XP = 12;
export const XP_PER_DROP_LOOT = 6;
export const XP_NEXT_MULTIPLIER = 1.35;
export const HP_PER_LEVEL = 25;

export const HEART_COLOR = 0xff2255;

// ── Camera
export const CAM_SMOOTH = 0.09;

// ── Biome colours
export const BIOME_COLORS = {
    forest: {
        base: '#8fc632',
        accent: 0x1a4a22,
        props: true,
        tint: '',
    },
    desert: {
        base: 0xb8843a,
        accent: 0xd4a055,
        tint: 0xddbb88,
        props: false
    },
    ice: {
        base: 0x8ec8de,
        accent: 0xb8e4f4,
        tint: 0xcceeff,
        props: false
    },
    lava: {
        base: '#262626',
        accent: 0xcc3300,
        glow: 0xff4400,
        magma: 0xff6600,
        obsidian: 0x1a0a0a,
        props: true,
    },
};

export const DIFFICULTY = {
    mobHp: 1,
    mobSpeed: 0.7,
    attackCooldown: 0.2,
};
