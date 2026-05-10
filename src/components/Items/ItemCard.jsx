import React, { useEffect, useRef, useState } from "react";
import { Badge, Tooltip, Popover } from "antd";

const rarityClass = {
    Common: "",
    Magic: "magic",
    Rare: "rare",
    Epic: "epic",
    Legendary: "item-legendary",
};

const STAT_LABELS = {
    damage: { label: 'DMG', color: '#e8a825' },
    chest: { label: 'ARM', color: '#7f77dd' },
    attackSpeed: { label: 'ASPD', color: '#3b9e75' },
    critChance: { label: 'CRIT', color: '#e06b6b' },
    moveSpeed: { label: 'SPD', color: '#4fc3f7' },
    projectiles: { label: 'PROJ', color: '#ce93d8' },
    health: { label: 'HP', color: '#3b9e75' },
};

const EMBER_COLORS_RAW = [
    [255, 220, 80],
    [255, 200, 50],
    [255, 180, 30],
    [255, 160, 20],
    [255, 140, 10],
];

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

function ContextMenu({ item, onAction, onClose }) {
    const actions = [
        { key: 'equip',  label: 'Equip',       icon: '',  show: !!item.equipSlot },
        //{ key: 'craft',  label: 'Craft',        icon: '',  show: true },
        { key: 'drop',   label: 'Delete',         icon: '',  show: true, danger: true },
        //{ key: 'sell',   label: `Sell (${Math.floor((item.price || 0) * 0.5)}g)`, icon: '💰', show: true },
    ].filter(a => a.show);

    return (
        <div style={{ minWidth: 140 }}>
            {/* Item header */}
            <div style={{ padding: '6px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: item.rarity?.color }}>{item.rarity?.name}</div>
            </div>

            {actions.map(a => (
                <div
                    key={a.key}
                    style={{ ...ACTION_STYLE, color: a.danger ? '#e06b6b' : 'rgba(255,255,255,0.8)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { onAction(a.key, item); onClose(); }}
                >
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                </div>
            ))}
        </div>
    );
}

const ItemCard = ({ onClick, onAction, item, quantity = 1, showName }) => {
    const canvasRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const isLegendary = item.rarity?.name === "Legendary";

    useEffect(() => {
        if (!isLegendary || !canvasRef.current) return;
        const cleanup = initEmberCanvas(canvasRef.current);
        return cleanup;
    }, [isLegendary]);

    const handleContextMenu = (e) => {
        e.preventDefault();
        setMenuOpen(true);
    };

    const handleAction = (actionKey, item) => {
        if (onAction) onAction(actionKey, item);
    };

    return (
        <Tooltip
            overlayStyle={{ zIndex: 10001 }}
            title={
                <div style={{ maxWidth: 260 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: item.rarity?.color }}>
                        {item.rarity?.name} • {item.type}
                    </div>
                    {item.description && (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{item.description}</div>
                    )}
                    {item.equipSlot && (
                        <div style={{ marginTop: 6, fontSize: 12 }}>Slot: <b>{item.equipSlot}</b></div>
                    )}
                    {item.stats && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>Stats:</div>
                            {Object.entries(item.stats).map(([key, value]) => (
                                <div key={key} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.8 }}>{key}</span>
                                    <span style={{ fontWeight: 600 }}>
                                        {typeof value === 'number' && value > 0 ? `+${value}` : value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {item.price && (
                        <div style={{ marginTop: 8, fontSize: 12 }}>Price: <b>{item.price} gold</b></div>
                    )}
                </div>
            }
        >
            <Popover
                open={menuOpen}
                onOpenChange={onAction ? setMenuOpen : ""}
                trigger="contextMenu"
                overlayStyle={{ zIndex: 10002 }}
                overlayInnerStyle={{ padding: 4 }}
                arrow={false}
                content={
                    <ContextMenu
                        item={item}
                        onAction={handleAction}
                        onClose={() => setMenuOpen(false)}
                    />
                }
            >
                <div
                    onClick={() => onClick(item)}
                    onContextMenu={handleContextMenu}
                    className={"item-card " + rarityClass[item.rarity?.name]}
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
                        src={item.texture}
                        width={24}
                        alt=""
                        style={{ position: 'relative', zIndex: 2 }}
                    />

                    {quantity > 1 && (
                        <Badge
                            count={quantity}
                            size="small"
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                background: 'transparent',
                                right: 0,
                                fontSize: 10,
                                top: 10,
                                padding: 0,
                            }}
                        />
                    )}
                </div>
            </Popover>
        </Tooltip>
    );
};

export default ItemCard;