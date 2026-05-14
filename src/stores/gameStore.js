// stores/gameStore.js
import {create} from 'zustand';
import {ItemDatabase} from "../game/items.js";

// How much each enchant level multiplies base stats (12% per level)
export const ENCHANT_BONUS_PER_LEVEL = 0.12;

// Given a slot wrapper { id, quantity, enchantLevel? } and a stat key+value,
// return the enchant-boosted value.
export function getEnchantedStatValue(slotOrEquip, statKey, baseValue) {
    const level = slotOrEquip?.enchantLevel ?? 0;
    if (!level) return baseValue;
    return baseValue * (1 + level * ENCHANT_BONUS_PER_LEVEL);
}

export const useGameStore = create((set, get) => ({
    // ===== CORE SYSTEMS =====
    world: null,
    app: null,
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
        maxHp: 100,
        location: { x: 0, y: 0 },
        stats: {
            attackSpeed: 0.6,
            damage: 5,
            projectiles: 1,
            moveSpeed: 100,
            dashSpeed: 100,
            dashRange: 320,
            dashDuration: 0.2,
            dashCooldown: 2,
            chainEnabled: true,
            chainCount: 0,
            chainRange: 350,
            chainDamage: 0.5,
            critChance: 5,
            critDamage: 100,
        }
    },

    // Inventory System
    inventory: {
        slots: Array(20).fill(null),
        // equipment now stores slot-wrappers: { id, quantity, enchantLevel? }
        // (plus any extra DB fields merged in for display — see equipItem)
        equipment: {
            weapon: null,
            armor: null,
            helmet: null,
            boots: null,
            ring: null,
        },
        gold: 100000,
        void_essence: 100000,
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

    basicAttack: { cooldownEnd: 0 },
    dash: { cooldownEnd: 0 },

    abilities: {
        ability1: {
            name: 'Arrow Barrage',
            icon: '/icons/ability1.png',
            cooldownEnd: 0,
            maxCooldown: 5000,
            level: 1,
            description: 'Shoots 10 arrows in cone front of player',
            arrowCount: 10,
            arrowSpread: 0.15,
            damageMultiplier: 3,
        },
        ability2: {
            name: 'Rapid Fire',
            icon: '/icons/ability2.png',
            cooldownEnd: 0,
            maxCooldown: 2000,
            level: 1,
            description: 'Rapidly fires 10 arrows at the nearest enemy',
            arrowCount: 6,
            damageMultiplier: 0.6,
            fireDelay: 6,
        },
        ability3: {
            name: 'Empower',
            icon: '/icons/ability3.png',
            cooldownEnd: 0,
            maxCooldown: 10000,
            level: 1,
            description: 'Temporarily increase damage and defense'
        },
        ability4: {
            name: 'Frost Arrow',
            icon: '/icons/ability4.png',
            cooldownEnd: 0,
            maxCooldown: 10000,
            level: 1,
            description: 'Launches a massive frost arrow that explodes and freezes enemies',
            damageMultiplier: 2.5,
            explosionRadius: 180,
            freezeDuration: 3,
            slowAmount: 0.6,
            arrowCount: 1,
            projectileSpeed: 8
        },
    },

    addXP: (amount) => {
        let levelUp = false;

        set(state => {
            let xp = state.player.xp + amount;
            let level = state.player.pLevel;
            let nextXP = state.player.XPnext;

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
                    xp,
                    pLevel: level,
                    XPnext: nextXP,
                    hp: levelUp ? base.maxHp : state.player.hp
                }
            };
        });

        get().recalculateStats();

        if (levelUp) {
            set(state => ({
                player: { ...state.player, hp: state.player.maxHp }
            }));
        }
    },

    useBasicAttack: () => {
        const state = get();
        const now = performance.now();
        if (now < state.basicAttack.cooldownEnd) return false;
        const cooldownMs = state.player.stats.attackSpeed * 1000;
        set({ basicAttack: { cooldownEnd: now + cooldownMs } });
        return true;
    },

    useDash: () => {
        const state = get();
        const now = performance.now();
        if (now < state.dash.cooldownEnd) return false;
        const cooldownMs = (state.player.stats.dashCooldown / 60) * 1000;
        set({ dash: { cooldownEnd: now + cooldownMs } });
        return true;
    },

    useAbility: (abilityNumber, currentTime) => {
        const state = get();
        const abilityKey = `ability${abilityNumber}`;
        const ability = state.abilities[abilityKey];
        if (currentTime < ability.cooldownEnd) return false;
        set(state => ({
            abilities: {
                ...state.abilities,
                [abilityKey]: { ...ability, cooldownEnd: currentTime + ability.maxCooldown }
            }
        }));
        return true;
    },

    toggleDebug: () => set(state => ({ debug: { enabled: !state.debug.enabled } })),
    setDebug: (value) => set(() => ({ debug: { enabled: value } })),

    setMuted: (muted) => set(state => ({ audio: { ...state.audio, isMuted: muted } })),
    toggleMuted: () => {
        const newMuted = !get().audio.isMuted;
        set(state => ({ audio: { ...state.audio, isMuted: newMuted } }));
        return newMuted;
    },
    setMusicVolume: (volume) => set(state => ({ audio: { ...state.audio, musicVolume: volume } })),
    setSfxVolume: (volume) => set(state => ({ audio: { ...state.audio, sfxVolume: volume } })),

    addKills: (amount) => set(state => ({ kills: state.kills + amount })),

    // ===== GOLD =====
    getGold: () => get().inventory.gold,

    addGold: (amount) => set(state => ({
        inventory: { ...state.inventory, gold: state.inventory.gold + amount }
    })),

    addVoidEssence: (amount) => set(state => ({
        inventory: { ...state.inventory, void_essence: state.inventory.void_essence + amount }
    })),

    removeGold: (amount) => {
        const currentGold = get().inventory.gold;
        if (currentGold >= amount) {
            set(state => ({
                inventory: { ...state.inventory, gold: state.inventory.gold - amount }
            }));
            return true;
        }
        return false;
    },

    // ===== INVENTORY =====
    addItem: (itemId, quantity = 1) => {
        const state = get();
        const dbItem = ItemDatabase[itemId];
        if (!dbItem) return false;

        const newSlots = [...state.inventory.slots];

        const existingSlot = newSlots.findIndex(
            s => s && s.id === itemId && dbItem.stackable
        );

        if (existingSlot !== -1) {
            newSlots[existingSlot] = {
                ...newSlots[existingSlot],
                quantity: (newSlots[existingSlot].quantity || 1) + quantity,
            };
            set({ inventory: { ...state.inventory, slots: newSlots } });
            return true;
        }

        const emptySlot = newSlots.findIndex(slot => slot === null);
        if (emptySlot === -1) return false;

        newSlots[emptySlot] = { id: itemId, quantity };
        set({ inventory: { ...state.inventory, slots: newSlots } });
        return true;
    },

    removeItem: (slotIndex, quantity = 1) => {
        const state = get();
        const newSlots = [...state.inventory.slots];
        const item = newSlots[slotIndex];
        if (!item) return;

        if (item.quantity > quantity) {
            newSlots[slotIndex] = { ...item, quantity: item.quantity - quantity };
        } else {
            newSlots[slotIndex] = null;
        }

        set({ inventory: { ...state.inventory, slots: newSlots } });
    },

    // ===== RECALCULATE STATS =====
    // equipment[slotKey] is now a slot-wrapper { id, quantity, enchantLevel?, ...dbFields }
    // We read enchantLevel from there and boost stats accordingly.
    recalculateStats: () => {
        const state = get();
        const level = state.player.pLevel;
        const base = getScaledStats(level);

        let bonus = {
            damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0,
            moveSpeed: 0, armor: 0, health: 0, projectiles: 0, dodge: 0, chainCount: 0,
        };

        Object.values(state.inventory.equipment).forEach(equippedSlot => {
            if (!equippedSlot) return;

            // equippedSlot is a slot-wrapper; get the DB item for stats
            const dbItem = ItemDatabase[equippedSlot.id];
            if (!dbItem?.stats) return;

            const enchantLevel = equippedSlot.enchantLevel ?? 0;
            const multiplier = 1 + enchantLevel * ENCHANT_BONUS_PER_LEVEL;

            Object.keys(bonus).forEach(k => {
                if (dbItem.stats[k]) {
                    bonus[k] += dbItem.stats[k] * multiplier;
                }
            });
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
                    chainCount: base.chainCount + bonus.chainCount,
                    armor: bonus.armor,
                    dodge: bonus.dodge,
                    // preserve dash stats
                    dashSpeed: state.player.stats.dashSpeed,
                    dashRange: state.player.stats.dashRange,
                    dashDuration: state.player.stats.dashDuration,
                    dashCooldown: state.player.stats.dashCooldown,
                    chainEnabled: state.player.stats.chainEnabled,
                    chainRange: state.player.stats.chainRange,
                    chainDamage: state.player.stats.chainDamage,
                }
            }
        });
    },

    updatePlayerPosition: (x, y) => set(state => ({
        player: { ...state.player, location: { x, y } }
    })),

    calculateCritDamage: (baseDamage) => {
        const { critChance, critDamage } = get().player.stats;
        const isCrit = Math.random() * 100 < critChance;
        if (isCrit) {
            return { damage: Math.floor(baseDamage * (1 + critDamage / 100)), isCrit: true };
        }
        return { damage: baseDamage, isCrit: false };
    },

    // ===== EQUIP =====
    // equipment now stores a slot-wrapper: { id, quantity, enchantLevel? }
    // so enchantLevel survives equip/unequip cycles.
    equipItem: (slotItem, inventoryIndex) => {
        const state = get();
        if (!slotItem?.id) return;

        const dbItem = ItemDatabase[slotItem.id];
        if (!dbItem?.equipSlot) return;

        const slotKey = dbItem.equipSlot;
        const newEquipment = { ...state.inventory.equipment };
        const oldSlot = newEquipment[slotKey];

        newEquipment[slotKey] = {
            id: slotItem.id,
            quantity: 1,
            enchantLevel: slotItem.enchantLevel ?? 0,
        };

        const newSlots = [...state.inventory.slots];

        let removed = false;
        if (typeof inventoryIndex === 'number' && inventoryIndex >= 0) {
            const cell = newSlots[inventoryIndex];
            if (cell && cell.id === slotItem.id) {
                newSlots[inventoryIndex] = null;
                removed = true;
            }
        }
        if (!removed) {
            const idx = newSlots.findIndex(
                (s) =>
                    s &&
                    s.id === slotItem.id &&
                    (s.enchantLevel ?? 0) === (slotItem.enchantLevel ?? 0)
            );
            if (idx !== -1) {
                newSlots[idx] = null;
            }
        }

        if (oldSlot) {
            const emptySlot = newSlots.findIndex((s) => s === null);
            if (emptySlot !== -1) {
                newSlots[emptySlot] = {
                    id: oldSlot.id,
                    quantity: 1,
                    enchantLevel: oldSlot.enchantLevel ?? 0,
                };
            }
        }

        set({ inventory: { ...state.inventory, slots: newSlots, equipment: newEquipment } });
        get().recalculateStats();
    },

    unequipItem: (slotKey) => {
        const state = get();
        const equippedSlot = state.inventory.equipment[slotKey];
        if (!equippedSlot) return false;

        const newSlots = [...state.inventory.slots];
        const emptySlot = newSlots.findIndex(s => s === null);

        if (emptySlot === -1) {
            console.log("Inventory full, cannot unequip");
            return false;
        }

        const newEquipment = { ...state.inventory.equipment };
        newEquipment[slotKey] = null;

        // Put back as slot-wrapper, preserving enchantLevel
        newSlots[emptySlot] = {
            id: equippedSlot.id,
            quantity: 1,
            enchantLevel: equippedSlot.enchantLevel ?? 0,
        };

        set({ inventory: { ...state.inventory, slots: newSlots, equipment: newEquipment } });
        get().recalculateStats();
        return true;
    },

    sellItem: (slotIndex) => {
        const state = get();
        const slot = state.inventory.slots[slotIndex];
        if (!slot) return;

        const dbItem = ItemDatabase[slot.id];
        const sellPrice = Math.floor((dbItem?.price || 0) * 0.5);

        get().removeItem(slotIndex);
        set(state => ({
            inventory: { ...state.inventory, gold: state.inventory.gold + sellPrice }
        }));
    },

    damagePlayer: (amount, source = 'unknown') => set(state => {
        const newHp = Math.max(0, state.player.hp - amount);
        console.log(`Damage: ${amount}, New HP: ${newHp} source: ${source}`);
        return {
            player: { ...state.player, hp: newHp },
            shake: Math.min(15, state.shake + amount * 0.3),
        };
    }),

    healPlayer: (amount) => set(state => ({
        player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + amount) }
    })),

    togglePause: () => set(state => ({
        gameState: { ...state.gameState, paused: !state.gameState.paused }
    })),
    setPaused: (paused) => set(state => ({ gameState: { ...state.gameState, paused } })),
    setDead: (dead) => set(state => ({ gameState: { ...state.gameState, dead } })),
    setLoadingRoom: (loading) => set(state => ({ gameState: { ...state.gameState, loadingRoom: loading } })),
    killPlayer: () => set(state => ({ gameState: { ...state.gameState, dead: true } })),

    openShop: () => set(state => ({ shop: { ...state.shop, isOpen: true } })),
    closeShop: () => set(state => ({ shop: { ...state.shop, isOpen: false } })),

    buyItem: (item) => {
        const state = get();
        if (state.inventory.gold >= item.price) {
            if (get().addItem(item.id ?? item)) {
                set(state => ({
                    inventory: { ...state.inventory, gold: state.inventory.gold - item.price }
                }));
                return true;
            }
        }
        return false;
    },
}));

function getScaledStats(level) {
    return {
        damage: 5 + (level - 1) * 2,
        maxHp: 100 + (level - 1) * 15,
        attackSpeed: 0.6 + (level - 1) * 0.01,
        moveSpeed: 100,
        critChance: 5,
        critDamage: 100,
        projectiles: 1,
        chainCount: 0
    };
}