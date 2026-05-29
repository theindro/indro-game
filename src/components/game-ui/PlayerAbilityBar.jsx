import React, { useMemo } from 'react';
import { Progress, Space, Divider, Tooltip } from 'antd';
import { useGameStore, INITIAL_ABILITIES } from '../../stores/gameStore.js';
import { ItemDatabase } from '../../game/items.js';
import { normalizeAbilityBarLayout } from '../../game/abilities/abilityBarLayout.js';
import { useQuickSlotDropHandlers } from './useQuickSlotDropHandlers.js';
import AbilityBarSlot, { EmptyAbilityBarSlot } from './AbilityBarSlot.jsx';
import BuffDebuffBar from './BuffDebuffBar.jsx';

const HOTKEYS = ['1', '2', '3', '4', '5', '6'];

const styles = {
    root: {
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99,
        padding: '0 16px',
    },
    abilitySlot: {
        width: 42,
        height: 42,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s',
    },
};

function DashCooldownOverlay({ cooldownEnd }) {
    const [now, setNow] = React.useState(() => performance.now());

    React.useEffect(() => {
        let frame;
        const tick = () => {
            setNow(performance.now());
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    if (!Number.isFinite(cooldownEnd) || now >= cooldownEnd) return null;

    const remaining = Math.max(0, (cooldownEnd - now) / 1000);

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                borderRadius: 4,
            }}
        >
            {remaining.toFixed(1)}
        </div>
    );
}

/** LMB / Space — not part of the 1–6 loadout. */
function UtilitySlot({
    icon,
    name,
    description,
    hotkeyLabel,
    onCooldown,
    cooldownEnd,
    maxCooldown,
}) {
    const ready = !onCooldown;

    return (
        <div
            style={{
                ...styles.abilitySlot,
                background: '#9c7f6e',
                border: '1px solid #8f7773',
            }}
        >
            <Tooltip
                title={
                    <div style={{ minWidth: 140 }}>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>{description}</div>
                        {maxCooldown != null && (
                            <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                                CD {Number(maxCooldown).toFixed(1)}s
                            </div>
                        )}
                    </div>
                }
                placement="top"
                arrow={false}
                overlayStyle={{ zIndex: 10001 }}
                mouseEnterDelay={0.15}
            >
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <img
                        src={icon}
                        alt={name}
                        width={42}
                        height={42}
                        draggable={false}
                        style={{ filter: ready ? 'none' : 'grayscale(0.6)', pointerEvents: 'none' }}
                    />
                    {!ready && <DashCooldownOverlay cooldownEnd={cooldownEnd} />}
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
                            pointerEvents: 'none',
                        }}
                    >
                        {hotkeyLabel}
                    </div>
                </div>
            </Tooltip>
        </div>
    );
}

export default function AbilityBar() {
    const playerLevel = useGameStore((s) => s.player.pLevel);
    const playerXp = useGameStore((s) => s.player.xp);
    const playerXpNext = useGameStore((s) => s.player.XPnext);
    const playerHp = useGameStore((s) => s.player.hp);
    const playerMaxHp = useGameStore((s) => s.player.maxHp);

    const abilities = useGameStore((s) => s.abilities);
    const skillUnlocks = useGameStore((s) => s.skillUnlocks);
    const abilityBarLayout = useGameStore((s) => s.abilityBarLayout);
    const basicAttack = useGameStore((s) => s.basicAttack);
    const dash = useGameStore((s) => s.dash);
    const dashMaxCharges = useGameStore((s) => s.player.stats.dashMaxCharges ?? 1);
    const dashCharges = Number.isFinite(dash?.charges) ? dash.charges : dashMaxCharges;
    const dashCooldownEnd = dash?.cooldownEnd ?? 0;
    const attackCooldown = useGameStore((s) => s.player.stats.attackCooldown);
    const dashCooldownStat = useGameStore((s) => s.player.stats.dashCooldown);

    const dashOnCooldown =
        dashCharges <= 0 &&
        Number.isFinite(dashCooldownEnd) &&
        performance.now() < dashCooldownEnd;

    const slots = useMemo(() => {
        const layout = normalizeAbilityBarLayout(abilityBarLayout, skillUnlocks);
        return HOTKEYS.map((hotkey, barIndex) => {
            const abilityKey = layout[barIndex];
            const ability = abilityKey
                ? abilities?.[abilityKey] ?? INITIAL_ABILITIES[abilityKey]
                : null;
            return { barIndex, hotkey, abilityKey, ability };
        });
    }, [abilities, skillUnlocks, abilityBarLayout]);

    if (!abilities?.ability1) return null;

    return (
        <div className="ability-bar-hud" style={styles.root}>
                <BuffDebuffBar />
            <div style={{ flex: 1, position: 'relative', marginBottom: 8 }}>

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
                    }}
                >
                    <span>
                        {Math.round(playerHp ?? 0)} / {playerMaxHp} HP
                    </span>
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
                    background: '#ebd1c7',
                    padding: '8px',
                    border: 'solid 2px #b09384',
                    borderRadius: '6px',
                }}
            >
                <Space size={8} wrap>
                    {slots.map((slot) =>
                        slot.ability ? (
                            <AbilityBarSlot
                                key={`slot-${slot.barIndex}-${slot.abilityKey}`}
                                barIndex={slot.barIndex}
                                ability={slot.ability}
                                hotkeyLabel={slot.hotkey}
                            />
                        ) : (
                            <EmptyAbilityBarSlot
                                key={`empty-${slot.barIndex}`}
                                barIndex={slot.barIndex}
                                hotkeyLabel={slot.hotkey}
                            />
                        )
                    )}
                </Space>

                <Divider type="vertical" style={{ height: 24, background: 'rgba(255,255,255,0.1)' }} />

                <Space size={8}>
                    <UtilitySlot
                        icon="/icons/attack.png"
                        name="Basic Attack"
                        description="Standard ranged attack toward the cursor."
                        hotkeyLabel="LMB"
                        onCooldown={performance.now() < (basicAttack?.cooldownEnd ?? 0)}
                        cooldownEnd={basicAttack?.cooldownEnd ?? 0}
                        maxCooldown={attackCooldown}
                    />
                    <UtilitySlot
                        icon="/icons/dash.png"
                        name="Dash"
                        description={
                            dashMaxCharges > 1
                                ? `Quick dodge · ${dashCharges}/${dashMaxCharges} charges`
                                : 'Quick dodge in the direction you are moving.'
                        }
                        hotkeyLabel="Space"
                        onCooldown={dashOnCooldown}
                        cooldownEnd={dashCooldownEnd}
                        maxCooldown={dashCooldownStat}
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
                <div
                    style={{
                        border: '1px solid rgb(64, 58, 52)',
                        padding: 4,
                        marginRight: -5,
                        marginTop: -5,
                        borderRadius: 6,
                        background: 'rgb(64, 58, 52)',
                        zIndex: 5,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        minWidth: 18,
                    }}
                >
                    {playerLevel}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
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

    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(id);
    }, []);

    const itemId = quickSlot1?.itemId;
    const dbItem = itemId ? ItemDatabase[itemId] : null;

    const totalQty = React.useMemo(() => {
        if (!itemId || !inventorySlots) return 0;
        return inventorySlots.reduce(
            (n, slot) => (slot?.id === itemId ? n + (slot.quantity ?? 1) : n),
            0
        );
    }, [itemId, inventorySlots]);

    const onCooldown = now < consumableCooldownUntil;

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
                opacity: dbItem && totalQty <= 0 ? 0.55 : 1,
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
                title={dbItem ? `${dbItem.name} (Q)` : 'Quick slot (Q)'}
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
                        {Math.ceil((consumableCooldownUntil - now) / 1000)}
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
        </div>
    );
}
