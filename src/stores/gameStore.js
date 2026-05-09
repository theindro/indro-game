// stores/gameStore.js
import {create} from 'zustand';

export const useGameStore = create((set, get) => ({
    // ===== CORE SYSTEMS =====
    world: null,           // PixiJS Container (stage)
    app: null,            // PixiJS Application
    colliders: [],
    kills: 0,
    debug: {
        enabled: false,
    },

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
            attackSpeed: 0.6,
            damage: 5,
            projectiles: 1,
            moveSpeed: 100,
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
        void_essence: 0,
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
        musicVolume: 0.1,
        sfxVolume: 0.2,
    },

    abilities: {
        // Ability 1 (Q/1)
        ability1: {
            name: 'Arrow Barrage',
            icon: '/icons/ability1.png',
            cooldownEnd: 0,
            maxCooldown: 5000, // 3 seconds at 60fps
            level: 1,
            description: 'Shoots 10 arrows in cone front of player',
            arrowCount: 10,
            arrowSpread: 0.15,
            damageMultiplier: 3,
        },
        // Ability 2 (W/2)
        ability2: {
            name: 'Rapid Fire',
            icon: '/icons/ability2.png',
            cooldownEnd: 0,
            maxCooldown: 2000, // 5 seconds at 60fps
            level: 1,
            description: 'Rapidly fires 10 arrows at the nearest enemy',
            arrowCount: 6,
            damageMultiplier: 0.6, // Each arrow does 60% damage
            fireDelay: 6, // Frames between shots (2 frames = 30 shots/sec at 60fps)
        },
        // Ability 3 (E/3)
        ability3: {
            name: 'Empower',
            icon: '/icons/ability3.png',
            cooldownEnd: 0,
            maxCooldown: 10000, // 5 seconds at 60fps
            level: 1,
            description: 'Temporarily increase damage and defense'
        },
        // Ability 4 (R/4)
        ability4: {
            name: 'Frost Arrow',
            icon: '/icons/ability4.png',
            cooldownEnd: 0,
            maxCooldown: 10000, // 10 seconds at 60fps
            level: 1,
            description: 'Launches a massive frost arrow that explodes and freezes enemies',
            stats: {
                damageMultiplier: 2.5,
                explosionRadius: 180,
                freezeDuration: 3, // 3 seconds at 60fps
                slowAmount: 0.6, // 60% slow
                arrowCount: 1,
                projectileSpeed: 8
            }
        },
    },

    addXP: (amount) => {
        set(state => {
            let xp = state.player.xp + amount;
            let level = state.player.pLevel;
            let nextXP = state.player.XPnext;
            let levelUp = false;

            // Player level up
            while (xp >= nextXP) {
                xp -= nextXP;
                level++;

                nextXP = Math.floor(nextXP * 1.25);

                levelUp = true;
            }
            const base = getScaledStats(level);


            return {
                player: {
                    ...state.player,
                    xp: xp,
                    pLevel: level,
                    XPnext: nextXP,
                    hp: levelUp ? base.maxHp : state.player.hp
                }
            };
        });

        // Recalculate after state settles
        get().recalculateStats();
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

    toggleDebug: () => set(state => ({
        debug: {
            enabled: !state.debug.enabled
        }
    })),

    setDebug: (value) => set(state => ({
        debug: {
            enabled: value
        }
    })),

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

    addVoidEssence: (amount) => {
        console.log(`💰 Adding ${amount} void essence`);
        set(state => ({
            inventory: {
                ...state.inventory,
                void_essence: state.inventory.void_essence + amount
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
        const level = state.player.pLevel;
        const base = getScaledStats(level);

        // Sum equipment bonuses
        let bonus = {
            damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0,
            moveSpeed: 0, armor: 0, health: 0, projectiles: 0, dodge: 0,
        };

        Object.values(state.inventory.equipment).forEach(item => {
            if (item?.stats) {
                Object.keys(bonus).forEach(k => {
                    bonus[k] += item.stats[k] || 0;
                });
            }
        });

        const newMaxHp = base.maxHp + bonus.health;

        set({
            player: {
                ...state.player,
                maxHp: newMaxHp,
                hp: Math.min(state.player.hp, newMaxHp),
                stats: {
                    damage: base.damage + bonus.damage,
                    attackSpeed: base.attackSpeed * (1 - (bonus.attackSpeed / 100)),
                    moveSpeed: base.moveSpeed + (bonus.moveSpeed * 100),
                    critChance: base.critChance + bonus.critChance,
                    critDamage: base.critDamage + bonus.critDamage,
                    projectiles: base.projectiles + bonus.projectiles,
                    armor: bonus.armor,
                    dodge: bonus.dodge,
                    // keep dash stats untouched
                    dashSpeed: state.player.stats.dashSpeed,
                    dashRange: state.player.stats.dashRange,
                    dashDuration: state.player.stats.dashDuration,
                    dashCooldown: state.player.stats.dashCooldown,
                    chainEnabled: state.player.stats.chainEnabled,
                    chainCount: state.player.stats.chainCount,
                    chainRange: state.player.stats.chainRange,
                    chainDamage: state.player.stats.chainDamage,
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

        console.log(`equipped ${slotKey}`);

        // Remove from equipment
        const newEquipment = {...state.inventory.equipment};
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

// Base stats at level 1, scaled per level
function getScaledStats(level) {
    return {
        damage:      5  + (level - 1) * 2,       // +2 dmg per level
        maxHp:       100 + (level - 1) * 15,      // +15 hp per level
        attackSpeed: 0.6 + (level - 1) * 0.01,    // +0.01 per level (diminishing feel)
        moveSpeed:   100,                          // flat, items only
        critChance:  5,                            // flat, items only
        critDamage:  100,                          // flat, items only
        projectiles: 1,                            // flat, items only
    };
}