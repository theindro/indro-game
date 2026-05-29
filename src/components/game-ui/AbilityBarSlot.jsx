import React from 'react';
import { Tooltip } from 'antd';
import { useGameStore } from '../../stores/gameStore.js';
import { useAbilityBarSlotDnD } from './useAbilityBarSlotDnD.js';

function CooldownOverlay({ cooldownEnd }) {
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
                pointerEvents: 'none',
            }}
        >
            {remaining.toFixed(1)}
        </div>
    );
}

const slotStyle = {
    width: 42,
    height: 42,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    cursor: 'grab',
    background: '#9c7f6e',
    border: '1px solid #8f7773',
};

const hotkeyBadgeStyle = {
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
};

/**
 * One of six hotkey slots — shows whichever ability is equipped here.
 */
export default function AbilityBarSlot({ barIndex, ability, hotkeyLabel }) {
    const playerDmg = useGameStore((s) => s.player?.stats?.damage ?? 0);
    const dnd = useAbilityBarSlotDnD(barIndex);

    const isReady = performance.now() >= (ability?.cooldownEnd ?? 0);

    const tooltipContent = (
        <div style={{ minWidth: 160 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ability.name}</div>
            <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 8 }}>
                {ability.description}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
                CD {Number(ability.maxCooldown ?? 0).toFixed(1)}s
                {ability.damageMultiplier
                    ? ` · Dmg ${Math.round(playerDmg * ability.damageMultiplier)}`
                    : ''}
            </div>
        </div>
    );

    return (
        <div
            className="ability-bar-slot ability-bar-slot--draggable"
            draggable
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
            onDragOver={dnd.handleDragOver}
            onDragEnter={dnd.handleDragEnter}
            onDragLeave={dnd.handleDragLeave}
            onDrop={dnd.handleDrop}
            style={slotStyle}
        >
            <Tooltip
                title={tooltipContent}
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
                        src={ability.icon}
                        alt={ability.name}
                        width={42}
                        height={42}
                        draggable={false}
                        style={{ filter: isReady ? 'none' : 'grayscale(0.6)', pointerEvents: 'none' }}
                    />
                    {!isReady && <CooldownOverlay cooldownEnd={ability.cooldownEnd} />}
                    <div style={hotkeyBadgeStyle}>{hotkeyLabel}</div>
                </div>
            </Tooltip>
        </div>
    );
}

/** Empty hotkey slot — accepts drops when reordering abilities. */
export function EmptyAbilityBarSlot({ barIndex, hotkeyLabel }) {
    const dnd = useAbilityBarSlotDnD(barIndex);

    const tooltipContent = (
        <div style={{ minWidth: 140 }}>
            <div style={{ fontWeight: 600 }}>Empty slot</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
                Hotkey {hotkeyLabel} — equip abilities in Skills (O)
            </div>
            <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
                Drag an ability here to assign
            </div>
        </div>
    );

    return (
        <div
            className="ability-bar-slot ability-bar-slot--empty"
            onDragOver={dnd.handleDragOver}
            onDragEnter={dnd.handleDragEnter}
            onDragLeave={dnd.handleDragLeave}
            onDrop={dnd.handleDrop}
            style={{
                ...slotStyle,
                cursor: 'default',
                background: 'rgba(0,0,0,0.2)',
                border: '1px dashed rgba(255,255,255,0.2)',
                opacity: 0.85,
            }}
        >
            <Tooltip
                title={tooltipContent}
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
                    <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>+</span>
                    <div style={hotkeyBadgeStyle}>{hotkeyLabel}</div>
                </div>
            </Tooltip>
        </div>
    );
}
