import { useEffect, useState } from 'react';
import {Tooltip, message, Tag} from 'antd';
import { useGameStore } from '../stores/gameStore';
import {audioManager} from "../game/utils/audioManager.js";

const STAT_LABELS = {
    damage:      { label: 'DMG',  color: '#e8a825' },
    chest:       { label: 'ARM',  color: '#7f77dd' },
    attackSpeed: { label: 'ASPD', color: '#3b9e75' },
    critChance:  { label: 'CRIT', color: '#e06b6b' },
    moveSpeed:   { label: 'SPD',  color: '#4fc3f7' },
    projectiles: { label: 'PROJ', color: '#ce93d8' },
    health:      { label: 'HP',   color: '#3b9e75' },
};

const EQUIPMENT_LAYOUT = [
    [null,      'helmet',  null   ],
    ['gloves',  'chest',   'weapon'],
    [null,      'pants',   null   ],
    ['amulet',  'boots',   'ring' ],
];

const styles = {
    panel: {
        display: 'flex',
        gap: 1,
        borderRadius: 16,
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 0.5px 0 rgba(255,255,255,0.07)',
    },
    col: {
        display: 'flex',
        flexDirection: 'column',
    },
    colHeader: {
        padding: '12px 16px 8px',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.5,
        color: 'rgba(255,255,255,0.2)',
        textTransform: 'uppercase',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
    },
    dividerV: {
        width: '0.5px',
        background: 'rgba(255,255,255,0.06)',
        flexShrink: 0,
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 14,
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.25)',
        fontSize: 16,
        cursor: 'pointer',
        lineHeight: 1,
        padding: 0,
    },
};

function StatPill({ statKey, value }) {
    const def = STAT_LABELS[statKey];
    if (!def || !value) return null;
    const display = statKey === 'moveSpeed'
        ? `+${Math.floor(value * 100)}%`
        : `+${value}`;
    return (
        <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: def.color,
            background: `${def.color}18`,
            borderRadius: 4,
            padding: '1px 4px',
            letterSpacing: 0.3,
        }}>
            {display} {def.label}
        </span>
    );
}

function ItemTooltip({ item, sellPrice, showSell }) {
    if (!item) return null;
    const statEntries = Object.entries(item.stats || {}).filter(([, v]) => v);
    return (
        <div style={{ minWidth: 150 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: item?.rarity?.color || '#fff', marginBottom: 3 }}>
                {item.name}
            </div>
            {item.description && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 8, lineHeight: 1.4 }}>
                    {item.description}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: showSell ? 8 : 0 }}>
                {statEntries.map(([k, v]) => (
                    <StatPill key={k} statKey={k} value={v} />
                ))}
            </div>
            {showSell && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', borderTop: '0.5px solid rgba(255,255,255,0.08)', paddingTop: 6, marginTop: 4 }}>
                    Click to equip · Right-click to sell for <span style={{ color: '#e8a825' }}>{sellPrice}g</span>
                </div>
            )}
        </div>
    );
}

function EquipSlot({ slotKey, item, onUnequip }) {
    const isEmpty = !item;
    const accentColor = item?.rarity?.color || 'rgba(255,255,255,0.08)';

    const content = (
        <div
            onContextMenu={(e) => { e.preventDefault(); if (item) onUnequip(slotKey); }}
            style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                background: item ? `${accentColor}14` : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${item ? accentColor : 'rgba(255,255,255,0.06)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item ? 'pointer' : 'default',
                transition: 'all 0.15s',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {item ? (
                item.texture ? (
                    <img src={item.texture} alt={item.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                ) : (
                    <span style={{ fontSize: 22 }}>?</span>
                )
            ) : (
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.08)' }}>·</span>
            )}
            {item && (
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: 2,
                    background: accentColor,
                    opacity: 0.6,
                }} />
            )}
        </div>
    );

    if (!item) return content;

    return (
        <Tooltip
            title={<ItemTooltip item={item} showSell={false} />}
            placement="right"
            arrow={false}
            overlayStyle={{ zIndex: 10002 }}
        >
            {content}
        </Tooltip>
    );
}

function InventorySlot({ item, index, onEquip, onSell }) {
    const accentColor = item?.rarity?.color || 'rgba(255,255,255,0.08)';
    const sellPrice = item ? Math.floor((item.price || 0) * 0.5) : 0;

    const content = (
        <div
            onClick={() => item && onEquip(index)}
            onContextMenu={(e) => { e.preventDefault(); if (item) onSell(index); }}
            style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: item ? `${accentColor}12` : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${item ? accentColor : 'rgba(255,255,255,0.05)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item ? 'pointer' : 'default',
                transition: 'border-color 0.15s, background 0.15s',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
            }}
        >
            {item ? (
                item.texture ? (
                    <img src={item.texture} alt={item.name} style={{ width: 30, height: 30, objectFit: 'contain' }} />
                ) : (
                    <span style={{ fontSize: 18 }}>?</span>
                )
            ) : (
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.06)' }}>·</span>
            )}
            {item?.quantity > 1 && (
                <span style={{
                    position: 'absolute', bottom: 2, right: 3,
                    fontSize: 8, fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1,
                }}>
                    {item.quantity}
                </span>
            )}
            {item && (
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: 1.5,
                    background: accentColor,
                    opacity: 0.5,
                }} />
            )}
        </div>
    );

    if (!item) return content;

    return (
        <Tooltip
            title={<ItemTooltip item={item} sellPrice={sellPrice} showSell />}
            placement="top"
            arrow={false}
            overlayStyle={{ zIndex: 10002 }}
        >
            {content}
        </Tooltip>
    );
}

function StatRow({ icon, label, value }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>{icon}</span>
                <span style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: 0.3,
                }}>
                    {label}
                </span>
            </div>
            <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                fontVariantNumeric: 'tabular-nums',
            }}>
                {value ?? 0}
            </span>
        </div>
    );
}

export default function Inventory() {
    const [isOpen, setIsOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const inventory = useGameStore((s) => s.inventory);
    const playerStats    = useGameStore((s) => s.player?.stats);
    const playerHp    = useGameStore((s) => s.player?.maxHp);
    const playerLevel    = useGameStore((s) => s.player?.pLevel);
    const equipItem   = useGameStore((s) => s.equipItem);
    const sellItem    = useGameStore((s) => s.sellItem);
    const unequipItem = useGameStore((s) => s.unequipItem);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'i' || e.key === 'I') setIsOpen(o => !o);
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (isOpen) {
            audioManager.playSFX('/sounds/open-close.mp3', 0.15);
        }
    }, [isOpen]);

    const handleEquip = (index) => {
        const item = inventory?.slots?.[index];
        if (!item) return;
        if (item.equipSlot) {
            equipItem(index);
            messageApi.open({ type: 'success', content: `Equipped ${item.name}`, duration: 1.5 });
        } else {
            messageApi.open({ type: 'warning', content: `${item.name} can't be equipped`, duration: 1.5 });
        }
    };

    const handleSell = (index) => {
        const item = inventory?.slots?.[index];
        if (!item) return;
        const sellPrice = Math.floor((item.price || 0) * 0.5);
        sellItem(index);
        messageApi.open({ type: 'success', content: `Sold ${item.name} for ${sellPrice}g`, duration: 1.5 });
    };

    const handleUnequip = (slotKey) => {
        const item = inventory?.equipment?.[slotKey];
        if (!item) return;
        const success = unequipItem(slotKey);
        if (success) {
            messageApi.open({ type: 'error', content: `Unequipped ${item.name}`, duration: 1.5 });
        } else {
            messageApi.open({ type: 'warning', content: 'Inventory full', duration: 1.5 });
        }
    };

    if (!isOpen) return <>{contextHolder}</>;

    const slots = inventory?.slots || Array(20).fill(null);
    const equipment = inventory?.equipment || {};


    return (
        <>
            {contextHolder}
            <style>{`
            @keyframes slideUp { from { opacity: 0; transform: translateY(10px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        `}</style>

            <div style={{
                position: 'fixed',
                bottom: 80,        // sits above the ability bar
                right: 20,
                zIndex: 10000,
                animation: 'slideUp 0.18s ease',
                display: 'flex',
                gap: 1,
                borderRadius: 16,
                overflow: 'hidden',
                background: 'rgba(10, 12, 16, 0.82)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 0.5px 0 rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}>
                {/* rest of the panel contents unchanged */}
                <div style={{...styles.panel, animation: 'slideUp 0.18s ease', position: 'relative'}}>


                    <div style={{...styles.col, width: 160}}>
                        <div style={styles.colHeader}>Stats</div>
                        <div style={{
                            paddingTop: '14px',
                            paddingLeft: '14px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1.2
                        }}>
                            Level {playerLevel}
                        </div>
                        <div style={{padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8}}>
                            <StatRow icon="⚔" label="Damage" value={playerStats?.damage}/>
                            <StatRow icon="❤" label="Health" value={playerHp}/>
                            <StatRow icon="⚡" label="Atk Speed" value={playerStats?.attackSpeed?.toFixed(2)}/>
                            <StatRow icon="👟" label="Move Speed" value={playerStats?.moveSpeed}/>
                            <StatRow icon="🎯" label="Crit Chance" value={`${playerStats?.critChance}%`}/>
                            <StatRow icon="💥" label="Crit Dmg" value={`${playerStats?.critDamage}%`}/>
                            <StatRow icon="🏹" label="Projectiles" value={playerStats?.projectiles}/>
                            <StatRow icon="🛡" label="Armor" value={playerStats?.armor ?? 0}/>
                        </div>
                    </div>

                    <div style={styles.dividerV}/>

                    {/* ── LEFT: Equipment ── */}
                    <div style={{...styles.col, width: 200}}>
                        <div style={styles.colHeader}>Equipment</div>

                        {/* Equipment grid */}
                        <div style={{padding: '10px 14px', flex: 1}}>
                        {EQUIPMENT_LAYOUT.map((row, ri) => (
                                <div key={ri}
                                     style={{display: 'flex', gap: 6, marginBottom: 6, justifyContent: 'center'}}>
                                    {row.map((slotKey, ci) => (
                                        <div key={ci}>
                                            {slotKey ? (
                                                <div>
                                                    <EquipSlot
                                                        slotKey={slotKey}
                                                        item={equipment[slotKey] || null}
                                                        onUnequip={handleUnequip}
                                                    />
                                                    <div style={{
                                                        fontSize: 8, color: 'rgba(255,255,255,0.18)',
                                                        textAlign: 'center', marginTop: 2,
                                                        textTransform: 'uppercase', letterSpacing: 0.5,
                                                    }}>
                                                        {slotKey}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{width: 52, height: 52 + 14}}/>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div style={{
                            padding: '8px 14px',
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.15)',
                            borderTop: '0.5px solid rgba(255,255,255,0.06)',
                            textAlign: 'center',
                        }}>
                            Right-click to unequip
                        </div>
                    </div>

                    <div style={styles.dividerV}/>

                    {/* ── RIGHT: Bag ── */}
                    <div style={{...styles.col, width: 280}}>
                        <div style={{
                            ...styles.colHeader,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span>Bag <img style={{width: "10px"}} src="/rpg/coins.png" alt=""/> {inventory.gold} <span><img
                                style={{width: "10px"}} src="/void_essence.png" alt=""/> {inventory.void_essence}</span></span>
                            <span style={{color: 'rgba(255,255,255,0.15)', fontWeight: 400, letterSpacing: 0}}>
                                {slots.filter(Boolean).length} / {slots.length}
                            </span>

                        </div>

                        <div style={{
                            padding: '10px 12px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 48px)',
                            gap: 6,
                            flex: 1,
                            margin: 'auto'
                        }}>
                            {slots.map((item, i) => (
                                <InventorySlot
                                    key={i}
                                    item={item}
                                    index={i}
                                    onEquip={handleEquip}
                                    onSell={handleSell}
                                />
                            ))}
                        </div>

                        <div style={{
                            padding: '8px 14px',
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.15)',
                            borderTop: '0.5px solid rgba(255,255,255,0.06)',
                            textAlign: 'center',
                        }}>
                            Click to equip · Right-click to sell
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        style={styles.closeBtn}
                        aria-label="Close inventory"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </>
    );
}