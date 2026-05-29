import React, { useEffect, useRef, useState } from "react";
import { Badge, Tooltip, Popover } from "antd";
import { ItemDatabase, ItemTypes } from "../../game/items.js";
import { ENCHANT_BONUS_PER_LEVEL } from "../../stores/gameStore.js";
import { canDismantleItem, getDismantleEssenceYield } from "../../game/itemDismantle.js";
import {
    buildInventoryDragPayload,
    beginInventoryDragSession,
    endInventoryDragSession,
    INVENTORY_DRAG_MIME,
} from "../../game/inventory/inventoryDrag.js";

const rarityClass = {
    Common: "",
    Magic: "magic",
    Rare: "rare",
    Epic: "epic",
    Legendary: "item-legendary",
};

const EMBER_COLORS_RAW = [
    [255, 220, 80],
    [255, 200, 50],
    [255, 180, 30],
    [255, 160, 20],
    [255, 140, 10],
];

// Returns a color for enchant level badge
function enchantLevelColor(lvl) {
    return '#7dcfee';
}

function initEmberCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = 50;
    const H = canvas.height = 50;
    const COUNT = 12;

    const embers = Array.from({ length: COUNT }, () => {
        const [r, g, b] = EMBER_COLORS_RAW[Math.floor(Math.random() * EMBER_COLORS_RAW.length)];
        return {
            x: 4 + Math.random() * (W - 8),
            y: H - 4,
            sz: 0.3 + Math.random(),
            dx: (Math.random() - 0.5) * 3,
            speed: 12 + Math.random() * 14,
            life: Math.random(),
            lifeSpeed: 0.06 + Math.random() * 0.08,
            r, g, b,
        };
    });

    let raf;
    let lastTime = null;

    function draw(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        ctx.clearRect(0, 0, W, H);

        for (const e of embers) {
            e.life += e.lifeSpeed * dt;
            if (e.life >= 1) {
                e.life = 0;
                e.x = 4 + Math.random() * (W - 8);
                e.y = H - 4;
                e.dx = (Math.random() - 0.5) * 3;
                e.speed = 6 + Math.random() * 8;
            }
            e.y -= e.speed * dt;
            e.x += e.dx * dt;
            const alpha = e.life < 0.2 ? e.life / 0.2 : 1 - (e.life - 0.2) / 0.8;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.sz, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${e.r},${e.g},${e.b},${alpha.toFixed(2)})`;
            ctx.fill();
        }

        raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
}

const ACTION_STYLE = {
    padding: '7px 12px',
    cursor: 'pointer',
    fontSize: 12,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.12s',
    userSelect: 'none',
};

function ContextMenu({ item, enchantLevel, onAction, onClose, dismantleYield }) {
    const actions = [
        { key: 'use',     label: 'Use',        icon: '', show: item.type === ItemTypes.CONSUMABLE },
        { key: 'equip',   label: 'Equip',      icon: '', show: !!item.equipSlot },
        { key: 'enchant', label: 'Enchant',    icon: '', show: !!item.equipSlot && !!item.stats },
        {
            key: 'dismantle',
            label: dismantleYield > 0 ? `Dismantle (+${dismantleYield} essence)` : 'Dismantle',
            icon: '',
            show: dismantleYield > 0,
        },
        { key: 'drop',    label: 'Drop',       icon: '', show: true, danger: true },
    ].filter(a => a.show);

    return (
        <div style={{ minWidth: 140 }}>
            <div style={{ padding: '6px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {item.name}
                    {enchantLevel > 0 && (
                        <span style={{ marginLeft: 6, color: enchantLevelColor(enchantLevel), fontSize: 12 }}>
                            +{enchantLevel}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 11, color: item.rarity?.color }}>{item.rarity?.name}</div>
            </div>

            {actions.map(a => (
                <div
                    key={a.key}
                    style={{ ...ACTION_STYLE, color: a.danger ? '#e06b6b' : 'rgba(255,255,255,0.8)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { onAction(a.key); onClose(); }}
                >
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── ItemCard ────────────────────────────────────────────────────────────────
// Accepts either:
//   item = DB item object (from ItemDatabase)        ← existing usage
//   slot = slot-wrapper { id, quantity, enchantLevel } ← new preferred usage
//
// For backward compat, if only `item` is passed the enchantLevel falls back to 0.
// Callers can also pass enchantLevel explicitly as a prop.

const ItemCard = ({
    onClick,
    onAction,
    item: itemProp,
    slot,
    quantity: quantityProp,
    showName,
    enchantLevel: enchantLevelProp,
    inventorySlotIndex,
    draggable = false,
}) => {
    const canvasRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const didDragRef = useRef(false);

    // Resolve the DB item and enchant level from either slot or item prop
    const resolvedSlot = slot ?? null;
    const dbItem = resolvedSlot ? ItemDatabase[resolvedSlot.id] : itemProp;
    const enchantLevel = enchantLevelProp ?? resolvedSlot?.enchantLevel ?? itemProp?.enchantLevel ?? 0;
    const quantity = quantityProp ?? resolvedSlot?.quantity ?? 1;

    /** Stable payload for equip/sell (always includes enchantLevel when known). */
    const slotPayload = resolvedSlot ?? {
        id: dbItem.id,
        quantity: quantityProp ?? 1,
        enchantLevel: enchantLevelProp ?? 0,
    };

    const isLegendary = dbItem?.rarity?.name === "Legendary";

    useEffect(() => {
        if (!isLegendary || !canvasRef.current) return;
        return initEmberCanvas(canvasRef.current);
    }, [isLegendary]);

    const handleContextMenu = (e) => {
        e.preventDefault();
        setMenuOpen(true);
    };

    const handleAction = (actionKey) => {
        if (onAction) onAction(actionKey, slotPayload);
    };

    const handleDragStart = (e) => {
        if (!draggable || inventorySlotIndex == null) return;
        didDragRef.current = true;
        beginInventoryDragSession();
        const payload = buildInventoryDragPayload(inventorySlotIndex);
        e.dataTransfer.setData(INVENTORY_DRAG_MIME, payload);
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragEnd = () => {
        endInventoryDragSession();
        requestAnimationFrame(() => {
            didDragRef.current = false;
        });
    };

    const handleClick = () => {
        if (didDragRef.current) return;
        if (onClick) onClick(slotPayload, inventorySlotIndex);
    };

    if (!dbItem) return null;

    const dismantleYield = canDismantleItem(dbItem.id) ? getDismantleEssenceYield(dbItem.id) : 0;

    // Build enchanted stat values for tooltip
    const multiplier = 1 + enchantLevel * ENCHANT_BONUS_PER_LEVEL;
    const displayStats = dbItem.stats
        ? Object.fromEntries(
            Object.entries(dbItem.stats).map(([k, v]) => [
                k,
                enchantLevel > 0 ? +(v * multiplier).toFixed(2) : v,
            ])
        )
        : null;

    const cardInner = (
        <div
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            className={'item-card ' + (rarityClass[dbItem.rarity?.name] ?? '')}
            style={{ position: 'relative' }}
        >
            {isLegendary && (
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 1,
                        borderRadius: 8,
                    }}
                />
            )}

            <img
                src={dbItem.texture}
                width={24}
                alt=""
                draggable={false}
                style={{ position: 'relative', zIndex: 2 }}
            />

            {quantity > 1 && (
                <Badge
                    count={quantity}
                    size="small"
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        top: 10,
                        background: 'transparent',
                        fontSize: 10,
                        padding: 0,
                    }}
                />
            )}

            {enchantLevel > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 2,
                        left: 2,
                        zIndex: 3,
                        fontSize: 8,
                        fontWeight: 800,
                        lineHeight: 1,
                        color: enchantLevelColor(enchantLevel),
                        textShadow: `0 0 4px ${enchantLevelColor(enchantLevel)}`,
                        pointerEvents: 'none',
                        letterSpacing: '-0.5px',
                    }}
                >
                    +{enchantLevel}
                </div>
            )}
        </div>
    );

    const cardWithMenus = (
        <Tooltip
            overlayStyle={{ zIndex: 10001 }}
            title={
                <div style={{ maxWidth: 260 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {dbItem.name}
                        {enchantLevel > 0 && (
                            <span style={{ marginLeft: 6, color: enchantLevelColor(enchantLevel), fontSize: 13 }}>
                                +{enchantLevel}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: dbItem.rarity?.color }}>
                        {dbItem.rarity?.name} • {dbItem.type}
                    </div>
                    {dbItem.description && (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{dbItem.description}</div>
                    )}
                    {dbItem.type === ItemTypes.CONSUMABLE && dbItem.healAmount > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12 }}>
                            Restores <b>{dbItem.healAmount}</b> HP
                            {dbItem.useCooldownMs ? (
                                <span style={{ opacity: 0.75 }}> · {(dbItem.useCooldownMs / 1000)}s cooldown</span>
                            ) : null}
                        </div>
                    )}
                    {dbItem.equipSlot && (
                        <div style={{ marginTop: 6, fontSize: 12 }}>Slot: <b>{dbItem.equipSlot}</b></div>
                    )}
                    {displayStats && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                                Stats{enchantLevel > 0 ? ` (enchant +${enchantLevel})` : ''}:
                            </div>
                            {Object.entries(displayStats).map(([key, value]) => {
                                const base = dbItem.stats[key];
                                const boosted = enchantLevel > 0 && value !== base;
                                return (
                                    <div key={key} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <span style={{ opacity: 0.8 }}>{key}</span>
                                        <span style={{ fontWeight: 600, color: boosted ? enchantLevelColor(enchantLevel) : undefined }}>
                                            {typeof value === 'number' && value > 0 ? `+${value}` : value}
                                            {boosted && (
                                                <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 4 }}>
                                                    (base {base})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            }
        >
            <Popover
                open={menuOpen}
                onOpenChange={onAction ? setMenuOpen : undefined}
                trigger="contextMenu"
                overlayStyle={{ zIndex: 10002 }}
                overlayInnerStyle={{ padding: 4 }}
                arrow={false}
                content={
                    <ContextMenu
                        item={dbItem}
                        enchantLevel={enchantLevel}
                        dismantleYield={dismantleYield}
                        onAction={handleAction}
                        onClose={() => setMenuOpen(false)}
                    />
                }
            >
                {cardInner}
            </Popover>
        </Tooltip>
    );

    const canDrag = draggable && inventorySlotIndex != null;
    if (!canDrag) return cardWithMenus;

    return (
        <div
            className="inventory-item-drag-root item-card--draggable"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {cardWithMenus}
        </div>
    );
};

export default ItemCard;