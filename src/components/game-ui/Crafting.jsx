import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Row, Col, Typography, Tabs, Button, Progress, message } from 'antd';
import { useGameStore } from '../../stores/gameStore.js';
import { ItemDatabase, ItemRarity, GearCraftingRecipes } from '../../game/items.js';
import ItemCard from '../Items/ItemCard.jsx';

const { Text } = Typography;

export const CraftingRecipes = GearCraftingRecipes;

// ─── Enchantment Config ───────────────────────────────────────────────────────
const ENCHANT_LEVELS = 10;

// Gold cost per enchant level
const enchantGoldCost = (level) => Math.floor(50 * Math.pow(1.6, level));

// Void essence cost per enchant level
const enchantEssenceCost = (level) => Math.floor(5 * Math.pow(1.5, level));

// Stat multiplier per enchant level (each level adds X% of base stat)
const ENCHANT_BONUS_PER_LEVEL = 0.12; // 12% of base stat per level

// Success chance per level
const enchantSuccessChance = (level) => Math.max(20, 100 - level * 8);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rarityColor = (rarity) => rarity?.color || 'rgba(255,255,255,0.4)';

function MaterialIcon({ itemId, size = 24 }) {
    const db = ItemDatabase[itemId];
    if (db?.texture) {
        return (
            <img
                src={db.texture}
                width={size}
                height={size}
                alt=""
                style={{ objectFit: 'contain', flexShrink: 0 }}
            />
        );
    }
    return <span style={{ fontSize: size - 6, width: size, textAlign: 'center' }}>📦</span>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
    return (
        <Text
            style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 8,
            }}
        >
            {children}
        </Text>
    );
}

function GoldBadge({ amount }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#e8a825', fontSize: 12 }}>
            <img src="/rpg/coins.png" width={14} height={14} alt="" style={{ marginBottom: -1 }} />
            {amount.toLocaleString()}
        </span>
    );
}

function EssenceBadge({ amount }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#c084fc', fontSize: 12 }}>
            <img src="/void_essence.png" width={14} height={14} alt="" style={{ marginBottom: -1 }} />
            {amount.toLocaleString()}
        </span>
    );
}

// ─── Crafting Tab ─────────────────────────────────────────────────────────────

function CraftingTab() {
    const [messageApi, contextHolder] = message.useMessage();
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    const inventory = useGameStore((s) => s.inventory);
    const removeItem = useGameStore((s) => s.removeItem);
    const addItem = useGameStore((s) => s.addItem);
    const removeGold = useGameStore((s) => s.removeGold);
    const slots = inventory?.slots || [];
    const gold = inventory?.gold ?? 0;

    // Count how many of each resource the player has
    const resourceCounts = useMemo(() => {
        const counts = {};
        slots.forEach((slot) => {
            if (!slot) return;
            counts[slot.id] = (counts[slot.id] || 0) + slot.quantity;
        });
        return counts;
    }, [slots]);

    const canCraft = useCallback(
        (recipe) => {
            if (gold < recipe.goldCost) return false;
            return recipe.ingredients.every(
                (ing) => (resourceCounts[ing.id] || 0) >= ing.quantity
            );
        },
        [resourceCounts, gold]
    );

    const handleCraft = useCallback(
        (recipe) => {
            if (!canCraft(recipe)) return;

            // Deduct ingredients
            recipe.ingredients.forEach((ing) => {
                let remaining = ing.quantity;
                slots.forEach((slot, i) => {
                    if (!slot || slot.id !== ing.id || remaining <= 0) return;
                    const take = Math.min(slot.quantity, remaining);
                    remaining -= take;
                    removeItem(i, take);
                });
            });

            removeGold(recipe.goldCost);

            const success = addItem(recipe.result, 1);
            if (success) {
                const db = ItemDatabase[recipe.result];
                messageApi.success(
                    <span>
                        Crafted <span style={{ color: rarityColor(db.rarity), fontWeight: 700 }}>{db.name}</span>!
                    </span>,
                    2
                );
            } else {
                messageApi.warning('Inventory full!', 2);
            }
        },
        [canCraft, slots, removeItem, removeGold, addItem, messageApi]
    );

    const recipe = selectedRecipe ? CraftingRecipes.find((r) => r.id === selectedRecipe) : null;
    const resultItem = recipe ? ItemDatabase[recipe.result] : null;
    const craftable = recipe ? canCraft(recipe) : false;

    return (
        <>
            {contextHolder}
            <div style={{ display: 'flex', gap: 12, height: '100%' }}>
                {/* Recipe list */}
                <div
                    style={{
                        width: 140,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        flexShrink: 0,
                        maxHeight: 500
                    }}
                >
                    <SectionLabel>Recipes</SectionLabel>
                    {[...CraftingRecipes]
                        .sort((a, b) => {
                            const tierOrder = { common: 0, magic: 1, rare: 2, epic: 3, legendary: 4 };
                            const td = (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0);
                            if (td !== 0) return td;
                            return (a.category ?? '').localeCompare(b.category ?? '');
                        })
                        .map((r) => {
                        const db = ItemDatabase[r.result];
                        const ok = canCraft(r);
                        const isSelected = selectedRecipe === r.id;
                        return (
                            <div
                                key={r.id}
                                onClick={() => setSelectedRecipe(r.id)}
                                style={{
                                    padding: '7px 10px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(255,255,255,0.02)',
                                    border: isSelected
                                        ? `1px solid ${rarityColor(db.rarity)}44`
                                        : '1px solid transparent',
                                    transition: 'all 0.12s',
                                    opacity: ok ? 1 : 0.5,
                                }}
                            >
                                <img src={db.texture} width={20} height={20} alt="" />
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: rarityColor(db.rarity),
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {db.name}
                                    </div>
                                    <GoldBadge amount={r.goldCost} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                {/* Recipe detail */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {!recipe ? (
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.2)',
                                fontSize: 12,
                                letterSpacing: '0.08em',
                            }}
                        >
                            ← Select a recipe
                        </div>
                    ) : (
                        <>
                            {/* Result item header */}
                            <div>
                                <SectionLabel>Result</SectionLabel>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${rarityColor(resultItem.rarity)}66`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img src={resultItem.texture} width={32} height={32} alt="" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{resultItem.name}</div>
                                        <div style={{ fontSize: 11, color: rarityColor(resultItem.rarity) }}>
                                            {resultItem.rarity?.name} · {resultItem.type}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                            {resultItem.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                {resultItem.stats && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '4px 12px',
                                        }}
                                    >
                                        {Object.entries(resultItem.stats).map(([k, v]) => (
                                            <span key={k} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                                                <span style={{ color: '#e8a825', fontWeight: 600 }}>+{v}</span> {k}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Ingredients */}
                            <div>
                                <SectionLabel>Materials required</SectionLabel>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {recipe.ingredients.map((ing) => {
                                        const have = resourceCounts[ing.id] || 0;
                                        const enough = have >= ing.quantity;
                                        const db = ItemDatabase[ing.id];
                                        return (
                                            <div
                                                key={ing.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '5px 8px',
                                                    borderRadius: 6,
                                                    background: enough
                                                        ? 'rgba(59,158,117,0.08)'
                                                        : 'rgba(224,107,107,0.08)',
                                                    border: `1px solid ${enough ? 'rgba(59,158,117,0.2)' : 'rgba(224,107,107,0.2)'}`,
                                                }}
                                            >
                                                <MaterialIcon itemId={ing.id} size={22} />
                                                <span style={{ flex: 1, fontSize: 12 }}>{db?.name || ing.id}</span>
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        color: enough ? '#3b9e75' : '#e06b6b',
                                                    }}
                                                >
                                                    {have} / {ing.quantity}
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {/* Gold cost */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '5px 8px',
                                            borderRadius: 6,
                                            background:
                                                gold >= recipe.goldCost
                                                    ? 'rgba(232,168,37,0.08)'
                                                    : 'rgba(224,107,107,0.08)',
                                            border: `1px solid ${gold >= recipe.goldCost ? 'rgba(232,168,37,0.25)' : 'rgba(224,107,107,0.2)'}`,
                                        }}
                                    >
                                        <img src="/rpg/coins.png" width={16} height={16} alt="" />
                                        <span style={{ flex: 1, fontSize: 12 }}>Gold</span>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: gold >= recipe.goldCost ? '#e8a825' : '#e06b6b',
                                            }}
                                        >
                                            {gold.toLocaleString()} / {recipe.goldCost.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Craft button */}
                            <div style={{ marginTop: 'auto' }}>
                                <Button
                                    type="primary"
                                    block
                                    disabled={!craftable}
                                    onClick={() => handleCraft(recipe)}
                                    style={{
                                        height: 38,
                                        fontWeight: 700,
                                        fontSize: 13,
                                        letterSpacing: '0.06em',
                                        background: craftable
                                            ? `linear-gradient(135deg, ${rarityColor(resultItem.rarity)}, ${rarityColor(resultItem.rarity)}aa)`
                                            : undefined,
                                        border: 'none',
                                    }}
                                >
                                    {craftable ? '⚒  Craft' : 'Missing materials'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Enchantment Tab ──────────────────────────────────────────────────────────

function EnchantmentTab({ initialSlotIndex = null }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(initialSlotIndex);
    const [enchanting, setEnchanting] = useState(false);

    useEffect(() => {
        if (initialSlotIndex !== null && initialSlotIndex !== undefined) {
            setSelectedSlotIndex(initialSlotIndex);
        }
    }, [initialSlotIndex]);

    const inventory = useGameStore((s) => s.inventory);
    const removeGold = useGameStore((s) => s.removeGold);

    // We need a direct setter to mutate slot enchant level
    const rawSet = useGameStore.setState;

    const slots = inventory?.slots || [];
    const gold = inventory?.gold ?? 0;
    const voidEssence = inventory?.void_essence ?? 0;

    // Only show equippable items
    const enchantableSlots = useMemo(
        () =>
            slots
                .map((slot, i) => ({ slot, i }))
                .filter(({ slot }) => {
                    if (!slot) return false;
                    const db = ItemDatabase[slot.id];
                    return db?.equipSlot && db?.stats;
                }),
        [slots]
    );

    const selectedEntry = selectedSlotIndex !== null
        ? enchantableSlots.find((e) => e.i === selectedSlotIndex)
        : null;

    const selectedSlot = selectedEntry?.slot ?? null;
    const selectedDb = selectedSlot ? ItemDatabase[selectedSlot.id] : null;
    const currentLevel = selectedSlot?.enchantLevel ?? 0;
    const nextLevel = currentLevel + 1;
    const maxed = currentLevel >= ENCHANT_LEVELS;

    const goldCost = maxed ? 0 : enchantGoldCost(currentLevel);
    const essenceCost = maxed ? 0 : enchantEssenceCost(currentLevel);
    const successChance = maxed ? 0 : enchantSuccessChance(currentLevel);

    const canEnchant =
        !maxed &&
        gold >= goldCost &&
        voidEssence >= essenceCost &&
        selectedSlot !== null;

    const handleEnchant = useCallback(() => {
        if (!canEnchant || enchanting) return;

        setEnchanting(true);

        removeGold(goldCost);

        // Deduct void essence
        rawSet((state) => ({
            inventory: {
                ...state.inventory,
                void_essence: state.inventory.void_essence - essenceCost,
            },
        }));

        const roll = Math.random() * 100;
        const success = roll <= successChance;

        setTimeout(() => {
            setEnchanting(false);

            if (success) {
                rawSet((state) => {
                    const newSlots = [...state.inventory.slots];
                    const slot = { ...newSlots[selectedSlotIndex] };
                    slot.enchantLevel = (slot.enchantLevel ?? 0) + 1;
                    newSlots[selectedSlotIndex] = slot;
                    return { inventory: { ...state.inventory, slots: newSlots } };
                });
                messageApi.success(
                    <span>
                        <span style={{ color: '#e8a825', fontWeight: 700 }}>✦ Enchant success!</span>{' '}
                        {selectedDb?.name} is now +{nextLevel}
                    </span>,
                    2
                );
            } else {
                messageApi.error(
                    <span style={{ color: '#e06b6b' }}>✦ Enchant failed! Materials consumed.</span>,
                    2
                );
            }
        }, 900);
    }, [
        canEnchant,
        enchanting,
        removeGold,
        rawSet,
        goldCost,
        essenceCost,
        successChance,
        selectedSlotIndex,
        selectedDb,
        nextLevel,
        messageApi,
    ]);

    // Compute enchanted stats preview
    const enchantedStats = useMemo(() => {
        if (!selectedDb?.stats || currentLevel === 0) return null;
        const boosted = {};
        Object.entries(selectedDb.stats).forEach(([k, v]) => {
            boosted[k] = +(v * (1 + currentLevel * ENCHANT_BONUS_PER_LEVEL)).toFixed(2);
        });
        return boosted;
    }, [selectedDb, currentLevel]);

    const nextStats = useMemo(() => {
        if (!selectedDb?.stats || maxed) return null;
        const boosted = {};
        Object.entries(selectedDb.stats).forEach(([k, v]) => {
            boosted[k] = +(v * (1 + nextLevel * ENCHANT_BONUS_PER_LEVEL)).toFixed(2);
        });
        return boosted;
    }, [selectedDb, nextLevel, maxed]);

    const enchantLevelColor = (lvl) => {
        return '#7dcfee';
    };

    return (
        <>
            {contextHolder}
            <div style={{ display: 'flex', gap: 12, height: '100%' }}>
                {/* Item selector */}
                <div style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <SectionLabel>Your inventory</SectionLabel>
                    {enchantableSlots.length === 0 && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '6px 2px' }}>
                            No equippable items
                        </div>
                    )}
                    {enchantableSlots.map(({ slot, i }) => {
                        const db = ItemDatabase[slot.id];
                        const lvl = slot.enchantLevel ?? 0;
                        const isSelected = selectedSlotIndex === i;
                        return (
                            <div
                                key={i}
                                onClick={() => setSelectedSlotIndex(i)}
                                style={{
                                    padding: '7px 10px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(255,255,255,0.02)',
                                    border: isSelected
                                        ? `1px solid ${rarityColor(db.rarity)}44`
                                        : '1px solid transparent',
                                    transition: 'all 0.12s',
                                }}
                            >
                                <img src={db.texture} width={20} height={20} alt="" />
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: rarityColor(db.rarity),
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {db.name}
                                    </div>
                                    {lvl > 0 && (
                                        <div
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: enchantLevelColor(lvl),
                                            }}
                                        >
                                            +{lvl} ✦
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                {/* Enchant detail */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {!selectedSlot ? (
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.2)',
                                fontSize: 12,
                                letterSpacing: '0.08em',
                            }}
                        >
                            ← Select an item to enchant
                        </div>
                    ) : (
                        <>
                            {/* Item header */}
                            <div>
                                <SectionLabel>Selected item</SectionLabel>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${rarityColor(selectedDb.rarity)}66`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img src={selectedDb.texture} width={32} height={32} alt="" />
                                        {currentLevel > 0 && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    bottom: -6,
                                                    right: -6,
                                                    background: '#0a0c10',
                                                    border: `1px solid ${enchantLevelColor(currentLevel)}`,
                                                    borderRadius: 4,
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    color: enchantLevelColor(currentLevel),
                                                    padding: '1px 4px',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                +{currentLevel}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                                            {selectedDb.name}
                                            {currentLevel > 0 && (
                                                <span
                                                    style={{
                                                        marginLeft: 6,
                                                        color: enchantLevelColor(currentLevel),
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    +{currentLevel}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 11, color: rarityColor(selectedDb.rarity) }}>
                                            {selectedDb.rarity?.name} · {selectedDb.type}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enchant level bar */}
                            <div>
                                <SectionLabel>Enchant level</SectionLabel>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {Array.from({ length: ENCHANT_LEVELS }).map((_, idx) => {
                                        const filled = idx < currentLevel;
                                        const isNext = idx === currentLevel && !maxed;
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    flex: 1,
                                                    height: 6,
                                                    borderRadius: 3,
                                                    background: filled
                                                        ? enchantLevelColor(idx + 1)
                                                        : isNext
                                                            ? 'rgba(255,255,255,0.1)'
                                                            : 'rgba(255,255,255,0.05)',
                                                    border: isNext ? '1px solid rgba(255,255,255,0.2)' : 'none',
                                                    transition: 'background 0.3s',
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>+0</Text>
                                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>+{ENCHANT_LEVELS}</Text>
                                </div>
                            </div>

                            {/* Stats comparison */}
                            {selectedDb.stats && (
                                <div>
                                    <SectionLabel>Stats {!maxed && nextStats ? `(→ +${nextLevel})` : ''}</SectionLabel>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {Object.entries(selectedDb.stats).map(([k, baseVal]) => {
                                            const current = enchantedStats?.[k] ?? baseVal;
                                            const next = nextStats?.[k] ?? null;
                                            return (
                                                <div
                                                    key={k}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        fontSize: 11,
                                                        padding: '3px 0',
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    }}
                                                >
                                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
                                                    <span>
                                                        <span style={{ color: '#e8a825', fontWeight: 600 }}>
                                                            +{current}
                                                        </span>
                                                        {next !== null && !maxed && (
                                                            <span
                                                                style={{
                                                                    color: '#3b9e75',
                                                                    fontWeight: 600,
                                                                    marginLeft: 6,
                                                                    fontSize: 10,
                                                                }}
                                                            >
                                                                → +{next}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Cost */}
                            {!maxed && (
                                <div>
                                    <SectionLabel>Cost for +{nextLevel}</SectionLabel>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                background: gold >= goldCost
                                                    ? 'rgba(232,168,37,0.08)'
                                                    : 'rgba(224,107,107,0.08)',
                                                border: `1px solid ${gold >= goldCost ? 'rgba(232,168,37,0.25)' : 'rgba(224,107,107,0.2)'}`,
                                            }}
                                        >
                                            <GoldBadge amount={goldCost} />
                                        </div>
                                        <div
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                background: voidEssence >= essenceCost
                                                    ? 'rgba(192,132,252,0.08)'
                                                    : 'rgba(224,107,107,0.08)',
                                                border: `1px solid ${voidEssence >= essenceCost ? 'rgba(192,132,252,0.25)' : 'rgba(224,107,107,0.2)'}`,
                                            }}
                                        >
                                            <EssenceBadge amount={essenceCost} />
                                        </div>
                                    </div>

                                    {/* Success chance */}
                                    <div style={{ marginTop: 10 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: 4,
                                            }}
                                        >
                                            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                                                SUCCESS CHANCE
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color:
                                                        successChance >= 70
                                                            ? '#3b9e75'
                                                            : successChance >= 40
                                                                ? '#e8a825'
                                                                : '#e06b6b',
                                                }}
                                            >
                                                {successChance}%
                                            </Text>
                                        </div>
                                        <Progress
                                            percent={successChance}
                                            showInfo={false}
                                            size="small"
                                            strokeColor={
                                                successChance >= 70
                                                    ? '#3b9e75'
                                                    : successChance >= 40
                                                        ? '#e8a825'
                                                        : '#e06b6b'
                                            }
                                            trailColor="rgba(255,255,255,0.06)"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Enchant / maxed button */}
                            <div style={{ marginTop: 'auto' }}>
                                {maxed ? (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '10px',
                                            borderRadius: 8,
                                            background: 'rgba(255,170,68,0.08)',
                                            border: '1px solid rgba(255,170,68,0.3)',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#ffaa44',
                                            letterSpacing: '0.06em',
                                        }}
                                    >
                                        ✦ MAX ENCHANT ✦
                                    </div>
                                ) : (
                                    <Button
                                        type="primary"
                                        block
                                        disabled={!canEnchant || enchanting}
                                        loading={enchanting}
                                        onClick={handleEnchant}
                                        style={{
                                            height: 38,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            letterSpacing: '0.06em',
                                            background: canEnchant
                                                ? 'linear-gradient(135deg, #7b2ff7, #c084fc)'
                                                : undefined,
                                            border: 'none',
                                        }}
                                    >
                                        {enchanting ? 'Enchanting…' : `✦ Enchant → +${nextLevel}`}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function CraftingPanel({ isOpen }) {
    const craftingOpenTab = useGameStore((s) => s.ui?.craftingOpenTab);
    const enchantFocusSlotIndex = useGameStore((s) => s.ui?.enchantFocusSlotIndex);
    const clearEnchantmentUI = useGameStore((s) => s.clearEnchantmentUI);

    const [activeTab, setActiveTab] = useState('crafting');

    useEffect(() => {
        if (isOpen && craftingOpenTab) {
            setActiveTab(craftingOpenTab);
        }
    }, [isOpen, craftingOpenTab]);

    useEffect(() => {
        if (!isOpen) {
            clearEnchantmentUI();
        }
    }, [isOpen, clearEnchantmentUI]);

    if (!isOpen) return null;

    return (
        <Card
            style={{ width: 520 }}
            className="bottom-right-float-card"
            styles={{
                body: { padding: 0 },
                header: { display: 'none' },
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '14px 20px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <div style={{ display: 'flex', gap: 20 }}>
                    {[
                        { key: 'crafting', label: '⚒  Crafting' },
                        { key: 'enchantment', label: '✦  Enchantment' },
                    ].map((tab) => (
                        <div
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                paddingBottom: 10,
                                fontSize: 13,
                                fontWeight: activeTab === tab.key ? 700 : 400,
                                color:
                                    activeTab === tab.key
                                        ? '#fff'
                                        : 'rgba(255,255,255,0.4)',
                                borderBottom:
                                    activeTab === tab.key
                                        ? '2px solid #7b2ff7'
                                        : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                userSelect: 'none',
                            }}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: 16, minHeight: 340 }}>
                {activeTab === 'crafting' ? (
                    <CraftingTab />
                ) : (
                    <EnchantmentTab initialSlotIndex={enchantFocusSlotIndex} />
                )}
            </div>
        </Card>
    );
}