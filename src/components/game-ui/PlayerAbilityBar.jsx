import React, {useEffect, useMemo, useState} from "react";
import {
    Avatar,
    Progress,
    Tooltip,
    Space,
    Divider,
    Badge, Row, Tag,
} from "antd";
import {
    AimOutlined,
    FireOutlined,
    LockOutlined,
    UserOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import {useGameStore, INITIAL_ABILITIES} from "../../stores/gameStore.js";
import {ItemDatabase} from "../../game/items.js";
import { DEFAULT_ABILITY_BAR_LAYOUT } from '../../game/abilities/abilityBarLayout.js';
import { useQuickSlotDropHandlers } from './useQuickSlotDropHandlers.js';
import AbilityBarSlot from './AbilityBarSlot.jsx';

const ABILITY_SLOTS = [
    {num: 1, key: 'ability1', hotkey: '1'},
    {num: 2, key: 'ability2', hotkey: '2'},
    {num: 3, key: 'ability3', hotkey: '3'},
    {num: 4, key: 'ability4', hotkey: '4'},
    {num: 5, key: 'ability5', hotkey: '5'},
    {num: 6, key: 'ability6', hotkey: '6'},
];

const styles = {
    root: {
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99,
        padding: "0 16px",
    },
    abilitySlot: {
        width: 42,
        height: 42,
        borderRadius: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: "pointer",

        transition: "all 0.2s",
    },
};

/** Basic attack / dash — fixed slots, not reorderable. */
const StaticAbilitySlot = React.memo(function StaticAbilitySlot({ ability, hotkeyLabel }) {
    const isReady = performance.now() >= (ability?.cooldownEnd ?? 0);

    return (
        <Tooltip
            title={
                <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 600 }}>{ability.name}</div>
                    <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>{ability.description}</div>
                </div>
            }
            placement="top"
            arrow={false}
            overlayStyle={{ zIndex: 10001 }}
        >
            <div
                style={{
                    ...styles.abilitySlot,
                    background: '#9c7f6e',
                    border: '1px solid #8f7773',
                    borderRadius: 4,
                }}
            >
                <img
                    src={ability.icon}
                    alt={ability.name}
                    width={28}
                    height={28}
                    style={{ filter: isReady ? 'none' : 'grayscale(0.6)' }}
                />
                {!isReady && <CooldownOverlay cooldownEnd={ability.cooldownEnd} />}
                <div
                    style={{
                        position: 'absolute',
                        fontSize: 10,
                        fontWeight: 600,
                        bottom: 0,
                        left: 0,
                        padding: 6,
                        lineHeight: '8px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        borderRadius: 4,
                        background: '#0000004d',
                    }}
                >
                    {hotkeyLabel}
                </div>
            </div>
        </Tooltip>
    );
});

export default function AbilityBar() {
    const playerLevel = useGameStore((s) => s.player.pLevel);
    const playerXp = useGameStore((s) => s.player.xp);
    const playerXpNext = useGameStore((s) => s.player.XPnext);
    const playerHp = useGameStore((s) => s.player.hp);
    const playerMaxHp = useGameStore((s) => s.player.maxHp);
    const playerStats = useGameStore((s) => s.player.stats);

    const attackCooldown = useGameStore((s) => s.player.stats.attackCooldown);
    const dashCooldown = useGameStore(s => s.player.stats.dashCooldown);

    const abilities = useGameStore((s) => s.abilities);
    const skillUnlocks = useGameStore((s) => s.skillUnlocks);
    const abilityBarLayout = useGameStore((s) => s.abilityBarLayout);
    const basicAttack = useGameStore((s) => s.basicAttack);
    const dash = useGameStore((s) => s.dash);

    const abilityList = useMemo(() => {
        const layout = abilityBarLayout ?? DEFAULT_ABILITY_BAR_LAYOUT;
        return ABILITY_SLOTS.map((slot, barIndex) => {
            const abilityKey = layout[barIndex] ?? slot.key;
            return {
                ...slot,
                barIndex,
                abilityKey,
                ability: abilities?.[abilityKey] ?? INITIAL_ABILITIES[abilityKey],
                unlocked: !!skillUnlocks?.[abilityKey],
            };
        });
    }, [abilities, skillUnlocks, abilityBarLayout]);

    if (!abilities?.ability1) return null;

    return (
        <div className="ability-bar-hud" style={styles.root}>

                <div style={{flex: 1, position: 'relative', marginBottom: 8}}>
                    <div
                        style={{
                            position: 'absolute',
                            top: 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                            marginBottom: 12
                        }}
                    >
                        <span>{Math.round(playerHp ?? 0)} / {playerMaxHp} HP</span>
                    </div>


                    <Progress
                        percent={((playerHp ?? 0) / (playerMaxHp ?? 100)) * 100}
                        showInfo={false}
                        strokeWidth={20}
                        strokeColor="#64b022"
                    />
                </div>


            <div
                style={{
                    background: "#ebd1c7",
                    padding: "8px",
                    border: "solid 2px #b09384",
                    borderRadius: "6px"
                }}
            >

                    <Space size={8} wrap>
                        {abilityList.map((slot) => (
                            <AbilityBarSlot
                                key={`bar-${slot.barIndex}-${slot.abilityKey}`}
                                barIndex={slot.barIndex}
                                ability={slot.ability}
                                hotkeyLabel={slot.hotkey}
                                isLocked={!slot.unlocked}
                                lockHint="Spend a point in Skills (O)"
                                slotStyle={{
                                    background: '#9c7f6e',
                                    border: '1px solid #8f7773',
                                    opacity: slot.unlocked ? 1 : 0.75,
                                    cursor: slot.unlocked ? 'grab' : 'default',
                                }}
                            />
                        ))}
                    </Space>

                    <Divider type="vertical" style={{height: 24, background: "rgba(255,255,255,0.1)"}}/>

                    {/* Basic Attack + Dash */}
                    <Space size={8}>
                        <StaticAbilitySlot
                            ability={{
                                name: "Basic Attack",
                                icon: "/icons/attack.png",
                                cooldownEnd: basicAttack?.cooldownEnd ?? 0,
                                maxCooldown: attackCooldown,
                                description: "Standard attack",
                                level: 1,
                            }}
                            hotkeyLabel="LMB"
                        />

                        <StaticAbilitySlot
                            ability={{
                                name: "Dash",
                                icon: "/icons/dash.png",
                                cooldownEnd: dash?.cooldownEnd ?? 0,
                                maxCooldown: dashCooldown,
                                description: "Quick dash",
                                level: 1,
                            }}
                            hotkeyLabel="Space"
                        />
                        <QuickSlotCell />
                    </Space>
            </div>

            <div
                style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    width: '100%',
                }}
            >
                <div style={{
                    border: "1px solid rgb(64, 58, 52)",
                    padding: 4,
                    marginRight: -5,
                    marginTop: -5,
                    borderRadius: 6,
                    background: "rgb(64, 58, 52)",
                    zIndex: 5,
                    fontWeight: "bold",
                    textAlign: "center",
                    minWidth: 18
                }}>
                    {playerLevel}
                </div>

                <div style={{flex: 1, position: 'relative'}}>
                    <div
                        style={{
                            position: 'absolute',
                            top: 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            zIndex: 2
                        }}
                    >
                        {playerXp} / {playerXpNext} XP
                    </div>

                    <Progress
                        percent={((playerXp ?? 0) / (playerXpNext ?? 100)) * 100}
                        showInfo={false}
                        strokeWidth={20}
                        strokeColor="#733cca"
                        trailColor="#3f3934"
                    />
                </div>
            </div>
        </div>
    );
}

function QuickSlotCell() {
    const quickSlot1 = useGameStore((s) => s.quickSlot1);
    const inventorySlots = useGameStore((s) => s.inventory?.slots);
    const consumableCooldownUntil = useGameStore((s) => s.player?.consumableCooldownUntil ?? 0);
    const clearQuickSlot1 = useGameStore((s) => s.clearQuickSlot1);
    const useQuickSlot1 = useGameStore((s) => s.useQuickSlot1);
    const { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } =
        useQuickSlotDropHandlers();

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(id);
    }, []);

    const itemId = quickSlot1?.itemId;
    const dbItem = itemId ? ItemDatabase[itemId] : null;

    const totalQty = useMemo(() => {
        if (!itemId || !inventorySlots) return 0;
        return inventorySlots.reduce(
            (n, slot) => (slot?.id === itemId ? n + (slot.quantity ?? 1) : n),
            0
        );
    }, [itemId, inventorySlots]);

    const onCooldown = now < consumableCooldownUntil;
    const cooldownRemainingSec = onCooldown
        ? Math.ceil((consumableCooldownUntil - now) / 1000)
        : 0;

    const tooltipContent = dbItem ? (
        <div style={{ minWidth: 160 }}>
            <div style={{ fontWeight: 600 }}>{dbItem.name}</div>
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
                Quick slot — press Q to use
            </div>
            {dbItem.healAmount > 0 && (
                <div style={{ fontSize: 12, marginTop: 6 }}>
                    Restores <b>{dbItem.healAmount}</b> HP · In bag: {totalQty}
                </div>
            )}
            <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                Drag a consumable here · Right-click to clear
            </div>
        </div>
    ) : (
        <div>
            <div style={{ fontWeight: 600 }}>Quick slot 1</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>
                Drag a consumable from inventory (Q to use)
            </div>
        </div>
    );

    return (
        <div
            className="quick-slot-cell"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                ...styles.abilitySlot,
                background: '#9c7f6e',
                border: '1px solid #8f7773',
                borderRadius: 4,
                opacity: dbItem && totalQty <= 0 ? 0.55 : 1,
            }}
        >
            <Tooltip title={tooltipContent} placement="top" overlayStyle={{ zIndex: 10001 }}>
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        clearQuickSlot1();
                    }}
                    onDoubleClick={() => useQuickSlot1()}
                >
                {dbItem?.texture ? (
                    <img
                        src={dbItem.texture}
                        alt={dbItem.name}
                        width={28}
                        height={28}
                        style={{ filter: onCooldown ? 'grayscale(0.65)' : 'none' }}
                    />
                ) : (
                    <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)' }}>+</span>
                )}

                {onCooldown && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#fff',
                        }}
                    >
                        {cooldownRemainingSec}
                    </div>
                )}

                {dbItem && totalQty > 1 && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fff',
                            textShadow: '0 1px 2px #000',
                        }}
                    >
                        {totalQty}
                    </div>
                )}

                <div
                    style={{
                        position: 'absolute',
                        fontSize: 10,
                        fontWeight: 600,
                        bottom: 0,
                        left: 0,
                        padding: 6,
                        lineHeight: '8px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        background: '#0000004d',
                    }}
                >
                    Q
                </div>
                </div>
            </Tooltip>
        </div>
    );
}

function CooldownOverlay({cooldownEnd}) {
    const [now, setNow] = useState(performance.now());

    useEffect(() => {
        let frame;

        const update = () => {
            setNow(performance.now());
            frame = requestAnimationFrame(update);
        };

        frame = requestAnimationFrame(update);

        return () => cancelAnimationFrame(frame);
    }, []);

    if (now >= cooldownEnd) return null;

    const remaining = (cooldownEnd - now) / 1000;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                borderRadius: 0,
            }}
        >
            {remaining.toFixed(1)}
        </div>
    );
}