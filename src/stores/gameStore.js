// stores/gameStore.js
import {create} from 'zustand';

export const useGameStore = create((set, get) => ({
    // ===== CORE SYSTEMS =====
    world: null,           // PixiJS Container (stage)
    app: null,            // PixiJS Application
    colliders: [],
    kills: 0,

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
        x: 0,
        y: 0,
        stats: {
            attackSpeed: 100,
            damage: 5,
            projectiles: 1,
            moveSpeed: 0.4,
            dashSpeed: 100,
            dashRange: 250,
            dashDuration: 60,
            dashCooldown: 120,
            // Chain stats
            chainEnabled: true,      // Enable/disable chain mechanic
            chainCount: 0,           // How many times it bounces
            chainRange: 350,         // How far to search for next target
            chainDamage: 0.5,        // Damage multiplier (1.0 = full damage, 0.8 = 80% damage)
            // Crit stats
            critChance: 5,      // 0 = 0%, 100 = 100%
            critDamage: 100,    // 100 = 100% (double damage), 150 = 150% (2.5x damage)
        }
    },

    // Inventory System
    inventory: {
        slots: Array(20).fill(null), // 20 inventory slots
        equipment: {
            weapon: null,
            armor: null,
            helmet: null,
            boots: null,
            ring: null,
        },
        gold: 0,
    },

    // Shop State
    shop: {
        isOpen: false,
        items: [],
        refreshTimer: 0,
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

    // ===== AUDIO SETTINGS =====
    audio: {
        isMuted: false,
        musicVolume: 0.3,
        sfxVolume: 0.2,
    },

    abilities: {
        // Ability 1 (Q/1)
        ability1: {
            name: 'Arrow Barrage',
            icon: '🏹',
            cooldownEnd: 0,
            maxCooldown: 500, // 3 seconds at 60fps
            level: 1,
            description: 'Shoots 10 arrows in cone front of player',
            arrowCount: 10,
            arrowSpread: 0.15,
            damageMultiplier: 4
        },
        // Ability 2 (W/2)
        ability2: {
            name: 'Rapid Fire',
            icon: '🏹⚡',
            cooldownEnd: 0,
            maxCooldown: 500, // 5 seconds at 60fps
            level: 1,
            description: 'Rapidly fires 10 arrows at the nearest enemy',
            arrowCount: 6,
            damageMultiplier: 0.6, // Each arrow does 60% damage
            fireDelay: 2, // Frames between shots (2 frames = 30 shots/sec at 60fps)
        },
        // Ability 3 (E/3)
        ability3: {
            name: 'Empower',
            icon: '⚡',
            cooldownEnd: 0,
            maxCooldown: 500, // 5 seconds at 60fps
            level: 1,
            description: 'Temporarily increase damage and defense'
        },
        // Ability 4 (R/4)
        ability4: {
            name: 'Frost Arrow',
            icon: '❄️',
            cooldownEnd: 0,
            maxCooldown: 600, // 10 seconds at 60fps
            level: 1,
            description: 'Launches a massive frost arrow that explodes and freezes enemies',
            stats: {
                damageMultiplier: 2.5,
                explosionRadius: 180,
                freezeDuration: 3000, // 3 seconds at 60fps
                slowAmount: 0.6, // 60% slow
                arrowCount: 1,
                projectileSpeed: 8
            }
        },
    },

    // Ability Actions
    useAbility: (abilityNumber, currentTime) => {
        const state = get();
        const abilityKey = `ability${abilityNumber}`;
        const ability = state.abilities[abilityKey];

        if (currentTime < ability.cooldownEnd) return false;

        set(state => ({
            abilities: {
                ...state.abilities,
                [abilityKey]: {
                    ...ability,
                    cooldownEnd: currentTime + ability.maxCooldown
                }
            }
        }));

        return true;
    },
    getAbilityCooldownPercent: (abilityNumber, now = performance.now()) => {
        const ability = get().abilities[`ability${abilityNumber}`];

        if (!ability?.cooldownEnd) return 100;

        const total = ability.maxCooldown;
        const remaining = ability.cooldownEnd - now;

        if (remaining <= 0) return 100;

        return (1 - remaining / total) * 100;
    },

    // Audio Actions - ONLY update the store, don't call audioManager
    setMuted: (muted) => {
        set(state => ({
            audio: {...state.audio, isMuted: muted}
        }));
    },

    toggleMuted: () => {
        const newMuted = !get().audio.isMuted;
        set(state => ({
            audio: {...state.audio, isMuted: newMuted}
        }));
        return newMuted;
    },

    setMusicVolume: (volume) => {
        set(state => ({
            audio: {...state.audio, musicVolume: volume}
        }));
    },

    setSfxVolume: (volume) => {
        set(state => ({
            audio: {...state.audio, sfxVolume: volume}
        }));
    },

    addKills: (amount) => {
        console.log(`Killed ${amount} mob`);
        set(state => ({
            ...state,
            kills: state.kills + amount
        }));
    },

    // ===== GOLD MANAGEMENT =====
    getGold: () => {
        return get().inventory.gold;
    },

    addGold: (amount) => {
        console.log(`💰 Adding ${amount} gold`);
        set(state => ({
            inventory: {
                ...state.inventory,
                gold: state.inventory.gold + amount
            }
        }));
    },

    removeGold: (amount) => {
        const currentGold = get().inventory.gold;
        if (currentGold >= amount) {
            set(state => ({
                inventory: {
                    ...state.inventory,
                    gold: state.inventory.gold - amount
                }
            }));
            return true;
        }
        console.log(`❌ Not enough gold! Need ${amount}, have ${currentGold}`);
        return false;
    },

    // Methods
    addItem: (item, quantity = 1) => {
        const state = get();
        const emptySlot = state.inventory.slots.findIndex(slot => slot === null);

        if (emptySlot !== -1) {
            const newSlots = [...state.inventory.slots];
            newSlots[emptySlot] = {...item, quantity};
            set({inventory: {...state.inventory, slots: newSlots}});
            return true;
        }
        return false; // Inventory full
    },

    removeItem: (slotIndex, quantity = 1) => {
        const state = get();
        const newSlots = [...state.inventory.slots];
        const item = newSlots[slotIndex];

        if (item.quantity > quantity) {
            newSlots[slotIndex].quantity -= quantity;
        } else {
            newSlots[slotIndex] = null;
        }

        set({inventory: {...state.inventory, slots: newSlots}});
    },

    equipItem: (slotIndex) => {
        const state = get();
        const item = state.inventory.slots[slotIndex];
        if (!item || !item.equipSlot) return;

        const newEquipment = {...state.inventory.equipment};
        const oldItem = newEquipment[item.equipSlot];

        // Swap equipment
        newEquipment[item.equipSlot] = item;

        const newSlots = [...state.inventory.slots];
        newSlots[slotIndex] = oldItem;

        set({
            inventory: {
                ...state.inventory,
                slots: newSlots,
                equipment: newEquipment
            }
        });

        // Update player stats based on equipment
        get().recalculateStats();
    },

    // In your gameStore.js, update recalculateStats to apply all item bonuses
    recalculateStats: () => {
        const state = get();
        let bonusDamage = 0;
        let bonusAttackSpeed = 0;
        let bonusCritChance = 0;
        let bonusCritDamage = 0;
        let bonusMoveSpeed = 0;
        let bonusArmor = 0;
        let bonusHealth = 0;
        let bonusProjectiles = 0;
        let bonusDodge = 0;

        console.log('here');

        Object.values(state.inventory.equipment).forEach(item => {
            if (item && item.stats) {
                bonusDamage += item.stats.damage || 0;
                bonusAttackSpeed += item.stats.attackSpeed || 0;
                bonusCritChance += item.stats.critChance || 0;
                bonusCritDamage += item.stats.critDamage || 0;
                bonusMoveSpeed += item.stats.moveSpeed || 0;
                bonusArmor += item.stats.armor || 0;
                bonusHealth += item.stats.health || 0;
                bonusProjectiles += item.stats.projectiles || 0;
                bonusDodge += item.stats.dodge || 0;
            }
        });

        // Base stats + bonuses
        const newMaxHp = 100 + bonusHealth;

        set({
            player: {
                ...state.player,
                maxHp: newMaxHp,
                hp: Math.min(state.player.hp, newMaxHp), // Don't exceed new max
                stats: {
                    damage: 5 + bonusDamage,
                    attackSpeed: 100 + bonusAttackSpeed,
                    moveSpeed: 0.4 + bonusMoveSpeed,
                    critChance: 5 + bonusCritChance,
                    critDamage: 100 + bonusCritDamage,
                    projectiles: 1 + bonusProjectiles,
                    armor: bonusArmor,
                    dodge: bonusDodge,
                }
            }
        });
    },

    // ===== Player Actions =====
    updatePlayerPosition: (x, y) => set(state => ({
        player: {...state.player, x, y}
    })),

    // ===== Helper: Calculate crit damage =====
    calculateCritDamage: (baseDamage) => {
        const state = get();
        const {critChance, critDamage} = state.player.stats;

        // Roll for crit
        const isCrit = Math.random() * 100 < critChance;

        if (isCrit) {
            // critDamage: 100 = 100% extra (double), 150 = 150% extra (2.5x)
            const multiplier = 1 + (critDamage / 100);
            const finalDamage = Math.floor(baseDamage * multiplier);
            return {damage: finalDamage, isCrit: true};
        }

        return {damage: baseDamage, isCrit: false};
    },

    // Add to your gameStore.js

    unequipItem: (slotKey) => {
        const state = get();
        const item = state.inventory.equipment[slotKey];

        if (!item) return false;

        // Find first empty slot in inventory
        const emptySlot = state.inventory.slots.findIndex(slot => slot === null);

        if (emptySlot === -1) {
            console.log("Inventory full, cannot unequip");
            return false;
        }

        // Remove from equipment
        const newEquipment = { ...state.inventory.equipment };
        newEquipment[slotKey] = null;

        // Add to inventory
        const newSlots = [...state.inventory.slots];
        newSlots[emptySlot] = item;

        set({
            inventory: {
                ...state.inventory,
                slots: newSlots,
                equipment: newEquipment
            }
        });

        // Recalculate stats after unequipping
        get().recalculateStats();

        return true;
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
    // Shop Methods
    openShop: () => {
        set({shop: {...get().shop, isOpen: true}});
    },

    closeShop: () => {
        set({shop: {...get().shop, isOpen: false}});
    },

    buyItem: (item) => {
        const state = get();
        if (state.inventory.gold >= item.price) {
            if (get().addItem(item)) {
                set(state => ({
                    inventory: {
                        ...state.inventory,
                        gold: state.inventory.gold - item.price
                    }
                }));
                return true;
            }
        }
        return false;
    },

    sellItem: (slotIndex) => {
        const state = get();
        const item = state.inventory.slots[slotIndex];
        if (item) {
            const sellPrice = Math.floor(item.price * 0.5);
            get().removeItem(slotIndex);
            set(state => ({
                inventory: {
                    ...state.inventory,
                    gold: state.inventory.gold + sellPrice
                }
            }));
        }
    },

}));