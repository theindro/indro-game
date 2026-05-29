import React from 'react';
import { Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import {
    beginAbilityBarDragSession,
    buildAbilityBarDragPayload,
    endAbilityBarDragSession,
    isAbilityBarDragActive,
    parseAbilityBarDragPayload,
    ABILITY_BAR_DRAG_MIME,
} from '../../game/inventory/abilityBarDrag.js';
import { useGameStore } from '../../stores/gameStore.js';

function CooldownOverlay({ cooldownEnd }) {
    const [now, setNow] = React.useState(() => performance.now());

    React.useEffect(() => {
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

const slotStyle = {
    width: 52,
    height: 52,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'box-shadow 0.12s ease, background 0.12s ease',
};

/**
 * One hotkey slot on the ability bar (1–6). Unlocked abilities can be dragged to swap positions.
 */
export default function AbilityBarSlot({
    barIndex,
    ability,
    hotkeyLabel,
    isLocked,
    lockHint,
    slotStyle: slotStyleOverride,
}) {
    const playerDmg = useGameStore((s) => s.player?.stats?.damage);
    const swapAbilityBarSlots = useGameStore((s) => s.swapAbilityBarSlots);

    const isReady =
        !isLocked &&
        performance.now() >= (ability?.cooldownEnd ?? 0);

    const canDrag = !isLocked;

    const handleDragStart = (e) => {
        if (!canDrag) return;
        beginAbilityBarDragSession();
        const payload = buildAbilityBarDragPayload(barIndex);
        e.dataTransfer.setData(ABILITY_BAR_DRAG_MIME, payload);
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        endAbilityBarDragSession();
    };

    const handleDragOver = (e) => {
        if (!isAbilityBarDragActive(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e) => {
        handleDragOver(e);
        e.currentTarget.classList.add('ability-bar-slot-drop-active');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('ability-bar-slot-drop-active');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('ability-bar-slot-drop-active');

        const payload = parseAbilityBarDragPayload(e.dataTransfer);
        if (!payload || payload.barIndex === barIndex) return;

        swapAbilityBarSlots(payload.barIndex, barIndex);
    };

    const tooltipContent = isLocked ? (
        <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{ability.name}</div>
            <div style={{ color: '#aaa', fontSize: 12 }}>
                {lockHint ?? 'Unlock in Skill Tree (O)'}
            </div>
        </div>
    ) : (
        <div style={{ minWidth: 160 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ability.name}</div>
            <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.4, marginBottom: 8 }}>
                {ability.description}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
                Lv {ability.level} · CD {Number(ability.maxCooldown ?? 0).toFixed(1)}s
                {ability.damageMultiplier
                    ? ` · Dmg ${Math.round(playerDmg * ability.damageMultiplier)}`
                    : ''}
            </div>
            {!isLocked && (
                <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
                    Drag to another slot to reorder
                </div>
            )}
        </div>
    );

    const mergedStyle = { ...slotStyle, ...slotStyleOverride };

    return (
        <div
            className={
                'ability-bar-slot' + (canDrag ? ' ability-bar-slot--draggable' : '')
            }
            draggable={canDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={mergedStyle}
        >
            <Tooltip
                title={tooltipContent}
                placement="top"
                arrow={false}
                overlayStyle={{ zIndex: 10001 }}
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
                    {isLocked ? (
                        <LockOutlined style={{ fontSize: 20, color: '#555' }} />
                    ) : (
                        <img
                            src={ability.icon}
                            alt={ability.name}
                            width={28}
                            height={28}
                            draggable={false}
                            style={{ filter: isReady ? 'none' : 'grayscale(0.6)' }}
                        />
                    )}

                    {!isLocked && !isReady && (
                        <CooldownOverlay cooldownEnd={ability.cooldownEnd} />
                    )}

                    {!isLocked && (
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
                    )}
                </div>
            </Tooltip>
        </div>
    );
}
