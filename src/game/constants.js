// ── World
export const TILE = 80;
export const TILES = 28;
export const WORLD_HALF = 1400;

// ── Player
export const PLAYER_SPEED = 3;
export const PLAYER_RADIUS = 16;
export const GS = 0.65; // global speed scalar

// ── Mobs
export const MOB_RADIUS = 13;
export const MOB_HP = 60;
export const MOB_COUNT = 16;
export const MOB_SAFE_RADIUS = 220;
export const MOB_SPAWN_RADIUS_MIN = 700;
export const MOB_SPAWN_RADIUS_MAX = 500;

// ── Boss
export const BOSS_RADIUS = 36;
export const BOSS_HP = 700;
export const BOSS_SPEED = 0.48;
export const BOSS_SHOOT_INTERVAL = 85;
export const BOSS_KILL_THRESHOLD = 5;
export const BOSS_ENRAGE_PCT = 0.4;

// ── Projectiles
export const ARROW_SPEED = 6;
export const ARROW_LIFE = 140;
export const ENEMY_PROJ_LIFE = 240;
export const ICE_MOB_SHOOT_RANGE = {min: 90, max: 380};
export const ICE_MOB_SHOOT_INTERVAL_BASE = 140;

// ── XP
export const XP_PER_MOB = 25;
export const XP_PER_BOSS = 250;
export const XP_PER_DROP_XP = 12;
export const XP_PER_DROP_LOOT = 6;
export const XP_NEXT_MULTIPLIER = 1.35;
export const HP_PER_LEVEL = 25;

export const HEART_COLOR = 0xff2255;

// ── Particles
export const PARTICLE_FRICTION = 0.9;

// ── Camera
export const CAM_SMOOTH = 0.09;

// ── Biome colours
export const BIOME_COLORS = {
    forest: {
        base: 0x0d3318,
        accent: 0x1a4a22,
        texture: '/grass-ground.jpg',
        props: [],
        tint: '',
    },
    desert: {
        base: 0xb8843a,
        accent: 0xd4a055,
        texture: '/desert-ground.png',
        tint: 0xddbb88,
        props: []
    },
    ice: {
        base: 0x8ec8de,
        accent: 0xb8e4f4,
        texture: '/snow-ground.png',
        props:['/ice/ice-1.png'],
        tint: 0xcceeff
    },
    lava: {
        base: 'rgb(24 11 31)',
        accent: 0xcc3300,
        glow: 0xff4400,
        magma: 0xff6600,
        obsidian: 0x1a0a0a,
        texture: '/lava/lava-ground.png',
        props:['/lava/lava-1.png', '/lava/lava-2.png', '/lava/lava-3.png', '/lava/lava-4.png'],
        tint: ''
    },
};

export const PLAYERSTATS = {
    attackSpeed: 100,
    damage: 10,
    projectiles: 1,
    moveSpeed: 0.2,
    dashSpeed: 100,
    dashRange: 150,
    dashDuration: 60,
    dashCooldown: 120,
};

export const DIFFICULTY = {
    mobHp: 1,
    mobSpeed: 0.7,
};

export const ROOMS = [
    {
        id: 1,
        mobs: 10,
        bosses: 1,
        biome: 'lava',
        bossType: 'lava',
        size: 30,
        propCount: 10,
        music: '/sounds/bg-music.wav' // 👈 ADD THIS
    },
    {
        id: 2,
        mobs: 15,
        bosses: 2,
        biome: 'ice',
        bossType: 'ice',
        size: 30,
        propCount: 6,
        music: '/sounds/bg-music.wav' // 👈 ADD THIS
    },
    {
        id: 3,
        mobs: 22,
        bosses: 3,
        biome: 'lava',
        bossType: 'lava',
        size: 30,
        propCount: 8,
    },
    {
        id: 4,
        mobs: 30,
        bosses: 4,
        biome: 'desert',
        bossType: 'desert',
        size: 32,
        propCount: 10,
    },
    {
        id: 5,
        mobs: 40,
        bosses: 5,
        biome: 'ice',
        bossType: 'ice',
        size: 32,
        propCount: 12,
    },
    {
        id: 6,
        mobs: 55,
        bosses: 6,
        biome: 'forest',
        bossType: 'forest',
        size: 34,
        propCount: 14,
    },
    {
        id: 7,
        mobs: 65,
        bosses: 7,
        biome: 'ice',
        bossType: 'ice',
        size: 36,
        propCount: 16,
    },
    {
        id: 8,
        mobs: 75,
        bosses: 8,
        biome: 'desert',
        bossType: 'desert',
        size: 38,
        propCount: 18,
    },
    {
        id: 9,
        mobs: 90,
        bosses: 9,
        biome: 'lava',
        bossType: 'lava',
        size: 40,
        propCount: 20,
    },
    {
        id: 10,
        mobs: 100,
        bosses: 10,
        biome: 'forest',
        bossType: 'forest',
        size: 45,
        propCount: 25,
    }
];