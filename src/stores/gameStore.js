// stores/gameStore.js
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {ItemDatabase, ItemTypes} from '../game/items.js';
import {
    onQuestMobKilled,
    onQuestItemCollected,
    onQuestItemCrafted,
    clearQuestToast,
} from '../game/quests/questProgress.js';
import { MAX_PLAYER_LEVEL } from '../game/skills/skillTreeDefinitions.js';
import {
    applyAbilitySkillDeltas,
    canAllocateSkill,
    canDeallocateSkill,
    computeSkillModifiers,
    migrateSkillRanks,
    getSkillPointsEarned,
    getTotalSkillPointsSpent,
} from '../game/skills/skillEffects.js';
import {
    canDismantleItem,
    compareInventorySlots,
    getDismantleEssenceYield,
} from '../game/itemDismantle.js';
import {
    DEFAULT_ABILITY_BAR_LAYOUT,
    normalizeAbilityBarLayout,
} from '../game/abilities/abilityBarLayout.js';

// How much each enchant level multiplies base stats (12% per level)
export const ENCHANT_BONUS_PER_LEVEL = 0.08;

// Given a slot wrapper { id, quantity, enchantLevel? } and a stat key+value,
// return the enchant-boosted value.
export function getEnchantedStatValue(slotOrEquip, statKey, baseValue) {
    const level = slotOrEquip?.enchantLevel ?? 0;
    if (!level) return baseValue;
    return baseValue * (1 + level * ENCHANT_BONUS_PER_LEVEL);
}

const STORAGE_KEY = 'voidhunt-game-v1';
const STORAGE_VERSION = 1;

export const INITIAL_ABILITIES = {
    ability1: {
        name: 'Arrow Barrage',
        icon: '/icons/ability1.png',
        cooldownEnd: 0,
        maxCooldown: 5,
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
        maxCooldown: 2,
        level: 1,
        description: 'Rapidly fires 10 arrows at the nearest enemy',
        arrowCount: 6,
        damageMultiplier: 0.6,
        fireDelay: 0.1,
    },
    ability3: {
        name: 'Empower',
        icon: '/icons/ability3.png',
        cooldownEnd: 0,
        maxCooldown: 15,
        level: 1,
        buffDuration: 6,
        description: '6s: fire aura — your arrows ignite enemies (burn)',
    },
    ability4: {
        name: 'Frost Arrow',
        icon: '/icons/ability4.png',
        cooldownEnd: 0,
        maxCooldown: 10,
        level: 1,
        description: 'Launches a massive frost arrow that explodes and freezes enemies',
        damageMultiplier: 2.5,
        explosionRadius: 180,
        freezeDuration: 3,
        slowAmount: 0.6,
        arrowCount: 1,
        projectileSpeed: 8,
    },
    ability5: {
        name: 'Venom Nova',
        icon: '/icons/ability2.png',
        cooldownEnd: 0,
        maxCooldown: 12,
        level: 1,
        description: 'Poison explosion at target location',
        explosionRadius: 140,
        poisonDamage: 3,
        poisonDuration: 5,
        damageMultiplier: 1.2,
    },
    ability6: {
        name: 'Spinshot',
        icon: '/icons/ability1.png',
        cooldownEnd: 0,
        maxCooldown: 44,
        level: 1,
        description: 'Spin and fire arrows in all directions for 2s. Uses chain & pierce.',
        spinDuration: 2,
        fireInterval: 0.09,
        arrowsPerWave: 6,
        rotationSpeed: 3.2,
        damageMultiplier: 0.5,
    },
};

export function cloneDefaultAbilities() {
    return /** @type {typeof INITIAL_ABILITIES} */ (JSON.parse(JSON.stringify(INITIAL_ABILITIES)));
}

/** 31-bit positive int for procedural world (biomes, chunk rolls, props, mob layout). */
export function generateWorldSeed() {
    return Math.floor(Math.random() * 2147483646) + 1;
}

/** @returns {import('zustand/vanilla').StateCreator<any>} */
function createGameStoreSlice(set, get) {
    return {
        // ===== CORE SYSTEMS =====
        world: null,
        app: null,
        colliders: [],
        kills: 0,
        debug: {
            enabled: false,
        },

        /** Every full browser load shows the title gate until dismissed. Not written to localStorage. */
        showStartScreen: true,
        /** Bumped on full progress reset so the Pixi game remounts with fresh runtime systems. */
        restartGeneration: 0,

        /** Deterministic procedural world; same seed ⇒ same biome/chunk/prop/mob layout. */
        worldSeed: generateWorldSeed(),

        /**
         * Interactable props already looted (`chunkKey_typeId_x_z`). Persisted so refresh cannot re-loot.
         */
        openedInteractableIds: [],

        /** Boss arena chunks cleared (`chunkX,chunkZ`) — boss stays dead, reward chest persists. */
        defeatedBossChunkKeys: [],

        /** React boss HP bar while player is in an active boss arena (`{ name, hp, maxHp }`). */
        bossEncounter: null,

        /** UI routing (crafting/enchant panel focus). */
        ui: {
            craftingOpenTab: null,
            enchantFocusSlotIndex: null,
        },

        /** Quest progress (see `src/game/quests/questDefinitions.js`). */
        quests: {
            progress: {},
            completed: [],
            recentComplete: null,
            /** Live world event row for QuestTracker (not persisted). */
            temporaryEvent: null,
        },

        /** World drops queued from inventory (processed in game loop). */
        pendingWorldDrops: [],

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
            location: {x: 0, y: 0},
            consumableCooldownUntil: 0,
            stats: {
                attackCooldown: 0.6,
                attackRange: 520,
                projectileSpeed: 1,
                damage: 5,
                projectiles: 1,
                moveSpeed: 100,
                dashSpeed: 100,
                dashRange: 320,
                dashDuration: 0.2,
                dashCooldown: 2,
                chainEnabled: false,
                chainCount: 0,
                chainRange: 350,
                chainDamage: 0.5,
                critChance: 5,
                critDamage: 100,
                pierceCount: 0,
                basicBurnChance: 0,
                basicPoisonChance: 0,
                basicFreezeChance: 0,
                burnTickDamage: 0,
            },
        },

        skills: {
            ranks: { unlock_barrage: 1 },
        },

        skillUnlocks: {
            ability1: true,
            ability2: false,
            ability3: false,
            ability4: false,
            ability5: false,
            ability6: false,
        },

        // Inventory System
        inventory: {
            slots: Array(20).fill(null),
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

        /** @type {{ itemId: string } | null} Bound consumable for Q (quick slot 1). */
        quickSlot1: null,

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
            phase: 1,
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

        /** Loot pickup toasts queued by `addItem` (not persisted). */
        pendingLootNotifications: [],

        // ===== AUDIO SETTINGS =====
        audio: {
            isMuted: false,
            musicVolume: 0.1,
            sfxVolume: 0.2,
        },

        basicAttack: {cooldownEnd: 0},
        dash: {cooldownEnd: 0},

        abilities: cloneDefaultAbilities(),

        /** Which ability id sits on hotkeys 1–6 (swap via drag on ability bar). */
        abilityBarLayout: [...DEFAULT_ABILITY_BAR_LAYOUT],

        /** Empower buff end time (`performance.now()` ms). */
        empowerBuff: { endsAt: 0 },

        addXP: (amount) => {
            let levelUp = false;

            set((state) => {
                let xp = state.player.xp + amount;
                let level = state.player.pLevel;
                let nextXP = state.player.XPnext;

                while (xp >= nextXP && level < MAX_PLAYER_LEVEL) {
                    xp -= nextXP;
                    level++;
                    nextXP = Math.floor(nextXP * 1.25);
                    levelUp = true;
                }
                if (level >= MAX_PLAYER_LEVEL) {
                    level = MAX_PLAYER_LEVEL;
                    xp = Math.min(xp, nextXP - 1);
                }
                const base = getScaledStats(level);

                return {
                    player: {
                        ...state.player,
                        xp,
                        pLevel: level,
                        XPnext: nextXP,
                        hp: levelUp ? base.maxHp : state.player.hp,
                    },
                };
            });

            get().recalculateStats();

            if (levelUp) {
                set((state) => ({
                    player: {...state.player, hp: state.player.maxHp},
                    levelUpEffect: true,
                }));
            }
        },

        clearLevelUpEffect: () => set({ levelUpEffect: false }),

        clearLootNotifications: () => set({ pendingLootNotifications: [] }),

        /**
         * Swap two ability bar positions (hotkeys stay 1–6; abilities move).
         * @param {number} fromIndex 0–5
         * @param {number} toIndex 0–5
         */
        swapAbilityBarSlots: (fromIndex, toIndex) => {
            if (fromIndex === toIndex) return { ok: false, reason: 'same_slot' };
            if (
                !Number.isInteger(fromIndex) ||
                !Number.isInteger(toIndex) ||
                fromIndex < 0 ||
                fromIndex > 5 ||
                toIndex < 0 ||
                toIndex > 5
            ) {
                return { ok: false, reason: 'invalid_index' };
            }

            const layout = normalizeAbilityBarLayout(get().abilityBarLayout);
            const next = [...layout];
            const tmp = next[fromIndex];
            next[fromIndex] = next[toIndex];
            next[toIndex] = tmp;
            set({ abilityBarLayout: next });
            return { ok: true };
        },

        allocateSkillPoint: (nodeId) => {
            const state = get();
            const ranks = state.skills?.ranks ?? { unlock_barrage: 1 };
            const check = canAllocateSkill(ranks, nodeId, state.player.pLevel);
            if (!check.ok) return check;

            set((s) => ({
                skills: {
                    ranks: {
                        ...(s.skills?.ranks ?? {}),
                        [nodeId]: ((s.skills?.ranks ?? {})[nodeId] ?? 0) + 1,
                    },
                },
            }));

            get().recalculateStats();
            return { ok: true };
        },

        deallocateSkillPoint: (nodeId) => {
            const state = get();
            const ranks = state.skills?.ranks ?? { unlock_barrage: 1 };
            const check = canDeallocateSkill(ranks, nodeId);
            if (!check.ok) return check;

            const next = (ranks[nodeId] ?? 0) - 1;
            set((s) => {
                const prev = { ...(s.skills?.ranks ?? {}) };
                if (next <= 0) delete prev[nodeId];
                else prev[nodeId] = next;
                return { skills: { ranks: prev } };
            });

            get().recalculateStats();
            return { ok: true };
        },

        getSkillPointsAvailable: () => {
            const state = get();
            return (
                getSkillPointsEarned(state.player.pLevel) -
                getTotalSkillPointsSpent(state.skills?.ranks ?? {})
            );
        },

        useBasicAttack: () => {
            const state = get();
            const now = performance.now();
            if (now < state.basicAttack.cooldownEnd) return false;
            const cooldownMs = state.player.stats.attackCooldown * 1000;
            set({basicAttack: {cooldownEnd: now + cooldownMs}});
            return true;
        },

        useDash: () => {
            const state = get();
            const now = performance.now();
            if (now < state.dash.cooldownEnd) return false;
            const cooldownMs = state.player.stats.dashCooldown * 1000;
            set({dash: {cooldownEnd: now + cooldownMs}});
            return true;
        },

        useAbility: (abilityNumber, currentTime) => {
            const state = get();
            const abilityKey = `ability${abilityNumber}`;
            const ability = state.abilities[abilityKey];
            if (currentTime < ability.cooldownEnd) return false;
            set((state) => ({
                abilities: {
                    ...state.abilities,
                    [abilityKey]: {...ability, cooldownEnd: currentTime + ability.maxCooldown * 1000},
                },
            }));
            return true;
        },

        activateEmpower: (durationSec = 6) => {
            const now = performance.now();
            set({ empowerBuff: { endsAt: now + durationSec * 1000 } });
        },

        isEmpowerActive: () => performance.now() < (get().empowerBuff?.endsAt ?? 0),

        toggleDebug: () => set((state) => ({debug: {enabled: !state.debug.enabled}})),
        setDebug: (value) => set(() => ({debug: {enabled: value}})),

        setMuted: (muted) => set((state) => ({audio: {...state.audio, isMuted: muted}})),
        toggleMuted: () => {
            const newMuted = !get().audio.isMuted;
            set((state) => ({audio: {...state.audio, isMuted: newMuted}}));
            return newMuted;
        },
        setMusicVolume: (volume) => set((state) => ({audio: {...state.audio, musicVolume: volume}})),
        setSfxVolume: (volume) => set((state) => ({audio: {...state.audio, sfxVolume: volume}})),

        addKills: (amount) => {
            set((state) => ({kills: state.kills + amount}));
            onQuestMobKilled(get, set, amount);
        },

        // ===== GOLD =====
        getGold: () => get().inventory.gold,

        addGold: (amount) =>
            set((state) => ({
                inventory: {...state.inventory, gold: state.inventory.gold + amount},
            })),

        addVoidEssence: (amount) =>
            set((state) => ({
                inventory: {...state.inventory, void_essence: state.inventory.void_essence + amount},
            })),

        removeVoidEssence: (amount) => {
            const current = get().inventory.void_essence ?? 0;
            if (current < amount) return false;
            set((state) => ({
                inventory: {
                    ...state.inventory,
                    void_essence: current - amount,
                },
            }));
            return true;
        },

        removeGold: (amount) => {
            const currentGold = get().inventory.gold;
            if (currentGold >= amount) {
                set((state) => ({
                    inventory: {...state.inventory, gold: state.inventory.gold - amount},
                }));
                return true;
            }
            return false;
        },

        // ===== INVENTORY =====
        canFitItem: (itemId, quantity = 1) => {
            const dbItem = ItemDatabase[itemId];
            if (!dbItem) return false;

            const slots = get().inventory.slots;
            if (dbItem.stackable && slots.some((s) => s?.id === itemId)) {
                return true;
            }

            const emptySlots = slots.filter((s) => s === null).length;
            if (dbItem.stackable) {
                return emptySlots >= 1;
            }

            return emptySlots >= quantity;
        },

        addItem: (itemId, quantity = 1, options = {}) => {
            const state = get();
            const dbItem = ItemDatabase[itemId];
            if (!dbItem) return false;

            if (!get().canFitItem(itemId, quantity)) return false;

            const enchantLevel = options.enchantLevel ?? 0;
            const newSlots = [...state.inventory.slots];
            const silent = options.silent === true;
            const lootToast = silent
                ? (state.pendingLootNotifications ?? [])
                : [
                      ...(state.pendingLootNotifications ?? []),
                      { itemId, quantity },
                  ];

            const existingSlot = newSlots.findIndex((s) => s && s.id === itemId && dbItem.stackable);

            if (existingSlot !== -1) {
                newSlots[existingSlot] = {
                    ...newSlots[existingSlot],
                    quantity: (newSlots[existingSlot].quantity || 1) + quantity,
                };
                set({
                    inventory: {...state.inventory, slots: newSlots},
                    pendingLootNotifications: lootToast,
                });
                onQuestItemCollected(get, set, itemId, quantity);
                return true;
            }

            const emptySlot = newSlots.findIndex((slot) => slot === null);
            if (emptySlot === -1) return false;

            const entry = {id: itemId, quantity};
            if (enchantLevel > 0) entry.enchantLevel = enchantLevel;
            newSlots[emptySlot] = entry;
            set({
                inventory: {...state.inventory, slots: newSlots},
                pendingLootNotifications: lootToast,
            });
            onQuestItemCollected(get, set, itemId, quantity);
            return true;
        },

        trackQuestCraft: (itemId, quantity = 1) => {
            onQuestItemCrafted(get, set, itemId, quantity);
        },

        clearQuestToast: () => clearQuestToast(set),

        /**
         * @param {{ id: string, title: string, tag: string, label: string, percent: number } | null} payload
         */
        setTemporaryEventQuest: (payload) =>
            set((state) => ({
                quests: {
                    ...state.quests,
                    temporaryEvent: payload,
                },
            })),

        /** Remove one item from a slot and queue a world drop at player position. */
        dropItemFromSlot: (slotIndex, worldX, worldY) => {
            const state = get();
            const item = state.inventory.slots[slotIndex];
            if (!item) return null;

            const slotItem = {
                id: item.id,
                quantity: 1,
                enchantLevel: item.enchantLevel ?? 0,
            };

            get().removeItem(slotIndex, 1);

            set((s) => ({
                pendingWorldDrops: [
                    ...(s.pendingWorldDrops ?? []),
                    {x: worldX, y: worldY, slotItem},
                ],
            }));

            return slotItem;
        },

        consumePendingWorldDrops: () => {
            const pending = get().pendingWorldDrops ?? [];
            if (!pending.length) return [];
            set({pendingWorldDrops: []});
            return pending;
        },

        openEnchantmentUI: (slotIndex) =>
            set((state) => ({
                ui: {
                    ...state.ui,
                    craftingOpenTab: 'enchantment',
                    enchantFocusSlotIndex: slotIndex,
                },
            })),

        clearEnchantmentUI: () =>
            set((state) => ({
                ui: {
                    ...state.ui,
                    craftingOpenTab: null,
                    enchantFocusSlotIndex: null,
                },
            })),

        removeItem: (slotIndex, quantity = 1) => {
            const state = get();
            const newSlots = [...state.inventory.slots];
            const item = newSlots[slotIndex];
            if (!item) return;

            if (item.quantity > quantity) {
                newSlots[slotIndex] = {...item, quantity: item.quantity - quantity};
            } else {
                newSlots[slotIndex] = null;
            }

            set({inventory: {...state.inventory, slots: newSlots}});
        },

        useConsumableFromSlot: (slotIndex) => {
            const state = get();
            const slot = state.inventory.slots[slotIndex];
            if (!slot?.id) return { ok: false, reason: 'empty' };

            const dbItem = ItemDatabase[slot.id];
            if (!dbItem || dbItem.type !== ItemTypes.CONSUMABLE) {
                return { ok: false, reason: 'not_consumable' };
            }

            if (state.gameState?.dead) return { ok: false, reason: 'dead' };

            const now = Date.now();
            const cooldownUntil = state.player.consumableCooldownUntil ?? 0;
            if (now < cooldownUntil) {
                return {
                    ok: false,
                    reason: 'cooldown',
                    remainingSec: Math.ceil((cooldownUntil - now) / 1000),
                };
            }

            const healAmount = dbItem.healAmount ?? 0;
            const hpBefore = state.player.hp;
            const healed = Math.min(healAmount, state.player.maxHp - hpBefore);
            if (healed <= 0) {
                return { ok: false, reason: 'full_hp' };
            }

            get().removeItem(slotIndex, 1);
            get().healPlayer(healAmount);

            const cooldownMs = dbItem.useCooldownMs ?? 5000;
            set((s) => ({
                player: {
                    ...s.player,
                    consumableCooldownUntil: now + cooldownMs,
                },
            }));

            return { ok: true, healed };
        },

        /**
         * Move or swap items between inventory slots (drag-and-drop).
         * @param {number} fromIndex
         * @param {number} toIndex
         */
        moveInventorySlot: (fromIndex, toIndex) => {
            if (fromIndex === toIndex) return { ok: false, reason: 'same_slot' };

            const state = get();
            const newSlots = [...state.inventory.slots];
            const from = newSlots[fromIndex];
            if (!from) return { ok: false, reason: 'empty' };

            const to = newSlots[toIndex];
            const db = ItemDatabase[from.id];

            if (!to) {
                newSlots[toIndex] = from;
                newSlots[fromIndex] = null;
            } else if (to.id === from.id && db?.stackable) {
                newSlots[toIndex] = {
                    ...to,
                    quantity: (to.quantity ?? 1) + (from.quantity ?? 1),
                };
                newSlots[fromIndex] = null;
            } else {
                newSlots[fromIndex] = to;
                newSlots[toIndex] = from;
            }

            set({ inventory: { ...state.inventory, slots: newSlots } });
            return { ok: true };
        },

        /**
         * @param {number} inventorySlotIndex
         */
        setQuickSlot1FromInventory: (inventorySlotIndex) => {
            const state = get();
            const slot = state.inventory.slots[inventorySlotIndex];
            if (!slot?.id) return { ok: false, reason: 'empty' };

            const dbItem = ItemDatabase[slot.id];
            if (!dbItem || dbItem.type !== ItemTypes.CONSUMABLE) {
                return { ok: false, reason: 'not_consumable' };
            }

            set({ quickSlot1: { itemId: slot.id } });
            return { ok: true, itemId: slot.id };
        },

        clearQuickSlot1: () => set({ quickSlot1: null }),

        useQuickSlot1: () => {
            const state = get();
            const itemId = state.quickSlot1?.itemId;
            if (!itemId) return { ok: false, reason: 'empty' };

            const slotIndex = state.inventory.slots.findIndex((s) => s?.id === itemId);
            if (slotIndex === -1) {
                return { ok: false, reason: 'no_item' };
            }

            return get().useConsumableFromSlot(slotIndex);
        },

        // ===== RECALCULATE STATS =====
        recalculateStats: () => {
            const state = get();
            const level = state.player.pLevel;
            const base = getScaledStats(level);
            const skillMods = computeSkillModifiers(state.skills?.ranks ?? {});

            let bonus = {
                damage: 0,
                attackSpeed: 0,
                critChance: 0,
                critDamage: 0,
                moveSpeed: 0,
                armor: 0,
                health: 0,
                projectiles: 0,
                dodge: 0,
                chainCount: 0,
                attackRange: 0,
                projectileSpeed: 0,
            };

            Object.values(state.inventory.equipment).forEach((equippedSlot) => {
                if (!equippedSlot) return;

                const dbItem = ItemDatabase[equippedSlot.id];
                if (!dbItem?.stats) return;

                const enchantLevel = equippedSlot.enchantLevel ?? 0;
                const multiplier = 1 + enchantLevel * ENCHANT_BONUS_PER_LEVEL;

                Object.keys(bonus).forEach((k) => {
                    if (dbItem.stats[k]) {
                        bonus[k] += dbItem.stats[k] * multiplier;
                    }
                });
            });

            const newMaxHp =
                base.maxHp + bonus.health + (skillMods.health ?? 0);

            const mergedAbilities = applyAbilitySkillDeltas(state.abilities, skillMods);

            set({
                abilities: mergedAbilities,
                skillUnlocks: { ...skillMods.unlockedAbilities },
                player: {
                    ...state.player,
                    maxHp: newMaxHp,
                    hp: Math.min(state.player.hp, newMaxHp),
                    stats: {
                        damage: base.damage + bonus.damage + skillMods.damage,
                        attackCooldown: Math.max(
                            0.12,
                            base.attackCooldown *
                                (1 - (bonus.attackSpeed + skillMods.attackSpeed) / 100)
                        ),
                        attackRange:
                            base.attackRange + bonus.attackRange + skillMods.attackRange,
                        projectileSpeed: Math.max(
                            0.15,
                            base.projectileSpeed *
                                (1 + (bonus.projectileSpeed + skillMods.projectileSpeed) / 100)
                        ),
                        moveSpeed: base.moveSpeed + bonus.moveSpeed * 100,
                        critChance: base.critChance + bonus.critChance + skillMods.critChance,
                        critDamage:
                            base.critDamage + bonus.critDamage + skillMods.critDamage,
                        projectiles:
                            base.projectiles + bonus.projectiles + skillMods.projectiles,
                        chainCount: base.chainCount + bonus.chainCount + skillMods.chainCount,
                        armor: bonus.armor,
                        dodge: bonus.dodge,
                        dashSpeed: state.player.stats.dashSpeed,
                        dashRange: state.player.stats.dashRange,
                        dashDuration: state.player.stats.dashDuration,
                        dashCooldown: state.player.stats.dashCooldown,
                        chainEnabled: skillMods.chainEnabled,
                        chainRange: 350 + skillMods.chainRange,
                        chainDamage: 0.5 + skillMods.chainDamage,
                        pierceCount: skillMods.pierceCount,
                        basicBurnChance: skillMods.basicBurnChance,
                        basicPoisonChance: skillMods.basicPoisonChance,
                        basicFreezeChance: skillMods.basicFreezeChance,
                        burnTickDamage: skillMods.burnTickDamage,
                    },
                },
            });
        },

        updatePlayerPosition: (x, y) =>
            set((state) => ({
                player: {...state.player, location: {x, y}},
            })),

        calculateCritDamage: (baseDamage) => {
            const {critChance, critDamage} = get().player.stats;
            const isCrit = Math.random() * 100 < critChance;
            if (isCrit) {
                return {damage: Math.floor(baseDamage * (1 + critDamage / 100)), isCrit: true};
            }
            return {damage: baseDamage, isCrit: false};
        },

        // ===== EQUIP =====
        equipItem: (slotItem, inventoryIndex) => {
            const state = get();
            if (!slotItem?.id) return;

            const dbItem = ItemDatabase[slotItem.id];
            if (!dbItem?.equipSlot) return;

            const slotKey = dbItem.equipSlot;
            const newEquipment = {...state.inventory.equipment};
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
                    (s) => s && s.id === slotItem.id && (s.enchantLevel ?? 0) === (slotItem.enchantLevel ?? 0)
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

            set({inventory: {...state.inventory, slots: newSlots, equipment: newEquipment}});
            get().recalculateStats();
        },

        unequipItem: (slotKey) => {
            const state = get();
            const equippedSlot = state.inventory.equipment[slotKey];
            if (!equippedSlot) return false;

            const newSlots = [...state.inventory.slots];
            const emptySlot = newSlots.findIndex((s) => s === null);

            if (emptySlot === -1) {
                console.log('Inventory full, cannot unequip');
                return false;
            }

            const newEquipment = {...state.inventory.equipment};
            newEquipment[slotKey] = null;

            newSlots[emptySlot] = {
                id: equippedSlot.id,
                quantity: 1,
                enchantLevel: equippedSlot.enchantLevel ?? 0,
            };

            set({inventory: {...state.inventory, slots: newSlots, equipment: newEquipment}});
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
            set((state) => ({
                inventory: {...state.inventory, gold: state.inventory.gold + sellPrice},
            }));
        },

        sortInventory: () => {
            const slots = get().inventory.slots ?? [];
            const filled = slots.filter(Boolean).sort(compareInventorySlots);
            const empties = slots.length - filled.length;
            set((state) => ({
                inventory: {
                    ...state.inventory,
                    slots: [...filled, ...Array(Math.max(0, empties)).fill(null)],
                },
            }));
        },

        dismantleInventorySlot: (slotIndex) => {
            const state = get();
            const slot = state.inventory.slots[slotIndex];
            if (!slot) return { ok: false, reason: 'empty' };

            if (!canDismantleItem(slot.id)) return { ok: false, reason: 'not_gear' };

            const qty = slot.quantity ?? 1;
            const perItem = getDismantleEssenceYield(slot.id);
            const totalEssence = perItem * qty;

            get().removeItem(slotIndex, qty);
            get().addVoidEssence(totalEssence);
            return { ok: true, essence: totalEssence, itemId: slot.id, quantity: qty };
        },

        dismantleEquippedItem: (equipSlotKey) => {
            const state = get();
            const equipped = state.inventory.equipment[equipSlotKey];
            if (!equipped) return { ok: false, reason: 'empty' };

            if (!canDismantleItem(equipped.id)) return { ok: false, reason: 'not_gear' };

            const essence = getDismantleEssenceYield(equipped.id);
            const newEquipment = { ...state.inventory.equipment, [equipSlotKey]: null };

            set((s) => ({
                inventory: {
                    ...s.inventory,
                    equipment: newEquipment,
                    void_essence: (s.inventory.void_essence ?? 0) + essence,
                },
            }));
            get().recalculateStats();
            return { ok: true, essence, itemId: equipped.id };
        },

        dismantleAllGearInBag: () => {
            const state = get();
            let totalEssence = 0;
            let count = 0;
            const newSlots = [...state.inventory.slots];

            for (let i = 0; i < newSlots.length; i++) {
                const slot = newSlots[i];
                if (!slot || !canDismantleItem(slot.id)) continue;
                const qty = slot.quantity ?? 1;
                totalEssence += getDismantleEssenceYield(slot.id) * qty;
                count += qty;
                newSlots[i] = null;
            }

            if (count === 0) return { ok: false, reason: 'none' };

            set((s) => ({
                inventory: {
                    ...s.inventory,
                    slots: newSlots,
                    void_essence: (s.inventory.void_essence ?? 0) + totalEssence,
                },
            }));
            return { ok: true, essence: totalEssence, count };
        },

        damagePlayer: (amount, source = 'unknown') =>
            set((state) => {
                const newHp = Math.max(0, state.player.hp - amount);
                console.log(`Damage: ${amount}, New HP: ${newHp} source: ${source}`);
                return {
                    player: {...state.player, hp: newHp},
                    shake: Math.min(15, state.shake + amount * 0.3),
                };
            }),

        healPlayer: (amount) =>
            set((state) => ({
                player: {...state.player, hp: Math.min(state.player.maxHp, state.player.hp + amount)},
            })),

        togglePause: () =>
            set((state) => {
                if (state.showStartScreen) return state;
                return {
                    gameState: {...state.gameState, paused: !state.gameState.paused},
                };
            }),
        setPaused: (paused) => set((state) => ({gameState: {...state.gameState, paused}})),
        setDead: (dead) => set((state) => ({gameState: {...state.gameState, dead}})),
        setLoadingRoom: (loading) => set((state) => ({gameState: {...state.gameState, loadingRoom: loading}})),
        killPlayer: () => set((state) => ({gameState: {...state.gameState, dead: true}})),

        /** Full progress reset, remount Pixi world, persist new run to localStorage. */
        restartGame: () => {
            const nextGen = (get().restartGeneration ?? 0) + 1;
            const base = getDefaultProgressPayload();
            set((state) => ({
                ...state,
                ...base,
                gameState: {
                    ...state.gameState,
                    paused: false,
                    dead: false,
                    loadingRoom: false,
                    currentRoomIndex: 0,
                },
                shake: 0,
                screenFlash: 0,
                damageNumbers: [],
                levelUpEffect: false,
                pendingLootNotifications: [],
                showStartScreen: false,
                restartGeneration: nextGen,
            }));
            get().recalculateStats();
            set((state) => ({
                player: {...state.player, hp: state.player.maxHp},
            }));

            window.location.reload();
        },

        /** Title screen: keep saved progress and enter the run. */
        continueFromTitle: () =>
            set((state) => ({
                showStartScreen: false,
                gameState: {...state.gameState, paused: false},
            })),

        /** Persist opened chest / harvestable id (stable string from InteractablePropManager). */
        addOpenedInteractableId: (id) => {
            if (!id || typeof id !== 'string') return;
            set((state) => {
                if (state.openedInteractableIds.includes(id)) return state;
                return {openedInteractableIds: [...state.openedInteractableIds, id]};
            });
        },

        markBossChunkDefeated: (chunkKey) => {
            if (!chunkKey || typeof chunkKey !== 'string') return;
            set((state) => {
                if (state.defeatedBossChunkKeys.includes(chunkKey)) return state;
                return {defeatedBossChunkKeys: [...state.defeatedBossChunkKeys, chunkKey]};
            });
        },

        isBossChunkDefeated: (chunkKey) => get().defeatedBossChunkKeys.includes(chunkKey),

        setBossEncounter: (encounter) => set({ bossEncounter: encounter }),

        clearBossEncounter: () => set({ bossEncounter: null }),

        openShop: () => set((state) => ({shop: {...state.shop, isOpen: true}})),
        closeShop: () => set((state) => ({shop: {...state.shop, isOpen: false}})),

        buyItem: (item) => {
            const state = get();
            if (state.inventory.gold >= item.price) {
                if (get().addItem(item.id ?? item)) {
                    set((state) => ({
                        inventory: {...state.inventory, gold: state.inventory.gold - item.price},
                    }));
                    return true;
                }
            }
            return false;
        },
    };
}

function getDefaultProgressPayload() {
    return {
        kills: 0,
        player: {
            xp: 0,
            pLevel: 1,
            XPnext: 100,
            hp: 100,
            maxHp: 100,
            location: {x: 0, y: 0},
            consumableCooldownUntil: 0,
            stats: {
                attackCooldown: 0.6,
                attackRange: 520,
                projectileSpeed: 1,
                damage: 5,
                projectiles: 1,
                moveSpeed: 100,
                dashSpeed: 100,
                dashRange: 320,
                dashDuration: 0.2,
                dashCooldown: 2,
                chainEnabled: false,
                chainCount: 0,
                chainRange: 350,
                chainDamage: 0.5,
                critChance: 5,
                critDamage: 100,
                pierceCount: 0,
                basicBurnChance: 0,
                basicPoisonChance: 0,
                basicFreezeChance: 0,
                burnTickDamage: 0,
            },
        },
        skills: {
            ranks: { unlock_barrage: 1 },
        },
        inventory: {
            slots: Array(20).fill(null),
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

        /** @type {{ itemId: string } | null} Bound consumable for Q (quick slot 1). */
        quickSlot1: null,
        abilities: cloneDefaultAbilities(),
        abilityBarLayout: [...DEFAULT_ABILITY_BAR_LAYOUT],

        /** Empower buff end time (`performance.now()` ms). */
        empowerBuff: { endsAt: 0 },
        worldSeed: generateWorldSeed(),
        openedInteractableIds: [],
        defeatedBossChunkKeys: [],
        boss: {
            instance: null,
            hp: 500,
            maxHp: 500,
            type: null,
            x: 0,
            y: 0,
            dead: false,
            phase: 1,
        },
        shop: {
            isOpen: false,
            items: [],
            refreshTimer: 0,
        },
        basicAttack: {cooldownEnd: 0},
        dash: {cooldownEnd: 0},
        quests: {
            progress: {},
            completed: [],
            recentComplete: null,
            temporaryEvent: null,
        },
    };
}

/** Zustand may pass either the partial `state` slice or a `{ state, version }` envelope. */
function unwrapPersistedSlice(persisted) {
    if (!persisted || typeof persisted !== 'object') return null;
    if ('state' in persisted && persisted.state != null && typeof persisted.state === 'object') {
        return persisted.state;
    }
    return persisted;
}

/** @param {any} persisted */
function mergePersistedState(persisted, current) {
    const p = unwrapPersistedSlice(persisted);
    if (!p || typeof p !== 'object') return current;
    return {
        ...current,
        player: p.player ?? current.player,
        inventory: p.inventory ?? current.inventory,
        quickSlot1: p.quickSlot1 ?? current.quickSlot1 ?? null,
        abilities: mergeAbilitiesForLoad(p.abilities, current.abilities),
        abilityBarLayout: normalizeAbilityBarLayout(
            p.abilityBarLayout ?? current.abilityBarLayout
        ),
        kills: typeof p.kills === 'number' ? p.kills : current.kills,
        worldSeed: (() => {
            if (typeof p.worldSeed === 'number' && Number.isFinite(p.worldSeed)) {
                return p.worldSeed | 0;
            }
            // Older saves (before worldSeed) lacked the key — use a stable default world.
            if (Object.keys(p).length > 0 && !('worldSeed' in p)) {
                return 1337;
            }
            return current.worldSeed;
        })(),
        openedInteractableIds: Array.isArray(p.openedInteractableIds)
            ? p.openedInteractableIds.filter((x) => typeof x === 'string')
            : current.openedInteractableIds,
        defeatedBossChunkKeys: Array.isArray(p.defeatedBossChunkKeys)
            ? p.defeatedBossChunkKeys.filter((x) => typeof x === 'string')
            : current.defeatedBossChunkKeys,
        audio: {...current.audio, ...(p.audio || {})},
        gameState: {
            ...current.gameState,
            currentRoomIndex:
                typeof p.currentRoomIndex === 'number' ? p.currentRoomIndex : current.gameState.currentRoomIndex,
        },
        showStartScreen: true,
        restartGeneration: current.restartGeneration,
        quests: p.quests
            ? {
                progress: {...(p.quests.progress ?? {})},
                completed: [...(p.quests.completed ?? [])],
                recentComplete: null,
                temporaryEvent: null,
            }
            : current.quests,
        skills: p.skills?.ranks
            ? { ranks: migrateSkillRanks({ ...(p.skills.ranks ?? {}) }) }
            : { ranks: { unlock_barrage: 1 } },
    };
}

function mergeAbilitiesForLoad(persisted, template) {
    if (!persisted || typeof persisted !== 'object') return template;
    const out = {...template};
    for (const key of Object.keys(template)) {
        if (persisted[key]) {
            out[key] = {
                ...template[key],
                ...persisted[key],
                cooldownEnd: 0,
            };
        }
    }
    return out;
}

export const useGameStore = create(
    persist(createGameStoreSlice, {
        name: STORAGE_KEY,
        version: STORAGE_VERSION,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
            player: state.player,
            inventory: state.inventory,
            quickSlot1: state.quickSlot1,
            abilities: state.abilities,
            abilityBarLayout: state.abilityBarLayout,
            kills: state.kills,
            worldSeed: state.worldSeed,
            openedInteractableIds: state.openedInteractableIds,
            defeatedBossChunkKeys: state.defeatedBossChunkKeys,
            audio: state.audio,
            currentRoomIndex: state.gameState.currentRoomIndex,
            quests: {
                progress: state.quests.progress,
                completed: state.quests.completed,
                recentComplete: state.quests.recentComplete,
            },
            skills: state.skills,
        }),
        merge: (persistedState, currentState) => mergePersistedState(persistedState, currentState),
        onRehydrateStorage: () => () => {
            queueMicrotask(() => {
                try {
                    useGameStore.getState().recalculateStats();
                } catch {
                    /* noop */
                }
            });
        },
    })
);

function getScaledStats(level) {
    return {
        damage: 5 + (level - 1) * 2,
        maxHp: 100 + (level - 1) * 15,
        attackCooldown: 0.6 + (level - 1) * 0.01,
        attackRange: 520 + (level - 1) * 4,
        projectileSpeed: 1,
        moveSpeed: 100,
        critChance: 5,
        critDamage: 100,
        projectiles: 1,
        chainCount: 0,
    };
}
