// stores/gameStore.js
import {create} from 'zustand';

export const useGameStore = create((set, get) => ({
    // ===== CORE SYSTEMS =====
    world: null,           // PixiJS Container (stage)
    app: null,            // PixiJS Application
    roomManager: null,
    colliders: [],

    // ===== GAME STATE =====
    gameState: {
        paused: false,
        dead: false,
        loadingRoom: false,
        currentRoomIndex: 0,
    },

    // ===== PLAYER =====
    player: {
        xp: 0,
        pLevel: 1,
        XPnext: 100,
        hp: 100,
        maxHp: 100,  // Changed from maxHp to match your usage
        gold: 0,
        x: 0,
        y: 0,
        stats: {
            attackSpeed: 100,
            damage: 10,
            projectiles: 1,
            moveSpeed: 0.2,
            dashSpeed: 100,
            dashRange: 150,
            dashDuration: 60,
            dashCooldown: 120,
            // Chain stats
            chainEnabled: true,      // Enable/disable chain mechanic
            chainCount: 2,           // How many times it bounces
            chainRange: 350,         // How far to search for next target
            chainDamage: 0.5,        // Damage multiplier (1.0 = full damage, 0.8 = 80% damage)
            // Crit stats
            critChance: 5,      // 0 = 0%, 100 = 100%
            critDamage: 100,    // 100 = 100% (double damage), 150 = 150% (2.5x damage)
        }
    },

    // ===== BOSS =====
    boss: {
        instance: null,
        hp: 500,
        maxHp: 500,
        type: null,
        x: 0,
        y: 0,
        dead: false,
        phase: 1
    },

    // ===== GAME OBJECTS =====
    enemyProjs: [],
    groundAttacks: [],
    waves: [],
    lasers: [],
    particles: [],
    props: [],

    // ===== EFFECTS =====
    shake: 0,
    screenFlash: 0,
    damageNumbers: [],
    levelUpEffect: false,

    // ===== AUDIO =====
    audioManager: null,

    // ===== Player Actions =====
    updatePlayerPosition: (x, y) => set(state => ({
        player: {...state.player, x, y}
    })),

    // ===== Helper: Calculate crit damage =====
    calculateCritDamage: (baseDamage) => {
        const state = get();
        const { critChance, critDamage } = state.player.stats;

        // Roll for crit
        const isCrit = Math.random() * 100 < critChance;

        if (isCrit) {
            // critDamage: 100 = 100% extra (double), 150 = 150% extra (2.5x)
            const multiplier = 1 + (critDamage / 100);
            const finalDamage = Math.floor(baseDamage * multiplier);
            return { damage: finalDamage, isCrit: true };
        }

        return { damage: baseDamage, isCrit: false };
    },

    damagePlayer: (amount, source = 'unknown') => set(state => {
        const newHp = Math.max(0, state.player.hp - amount);
        console.log(`Damage: ${amount}, New HP: ${newHp} source: ${source}`);

        return {
            player: {
                ...state.player,
                hp: newHp,
            },
            shake: Math.min(15, state.shake + amount * 0.3),
        };
    }),

    healPlayer: (amount) => set(state => ({
        player: {
            ...state.player,
            hp: Math.min(state.player.maxHp, state.player.hp + amount)
        }
    })),

    // ===== Game State Actions =====
    togglePause: () => set(state => ({
        gameState: {
            ...state.gameState,
            paused: !state.gameState.paused
        }
    })),

    setPaused: (paused) => set(state => ({
        gameState: {
            ...state.gameState,
            paused
        }
    })),

    setDead: (dead) => set(state => ({
        gameState: {
            ...state.gameState,
            dead
        }
    })),

    setLoadingRoom: (loading) => set(state => ({
        gameState: {
            ...state.gameState,
            loadingRoom: loading
        }
    })),

    killPlayer: () => set(state => ({
        gameState: {
            ...state.gameState,
            dead: true
        }
    })),
}));