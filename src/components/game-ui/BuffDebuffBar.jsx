import React, { useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { useGameStore } from '../../stores/gameStore.js';
import { getActivePlayerDebuffsForUI } from '../../game/combat/playerDebuffs.js';
import {
    PLAYER_BUFF_DEFS,
    PLAYER_DEBUFF_DEFS,
} from '../../game/combat/playerStatusDefinitions.js';

const SLOT_SIZE = 34;

const borderByKind = {
    buff: '2px solid #5ec4ff',
    debuff: '2px solid #e86a4a',
};

function StatusEffectSlot({ effect }) {
    const { kind, name, description, icon, remainingSec } = effect;
    const label = remainingSec >= 10 ? Math.ceil(remainingSec) : remainingSec.toFixed(1);

    return (
        <Tooltip
            title={
                <div style={{ minWidth: 160, maxWidth: 240 }}>
                    <div style={{ fontWeight: 600, color: kind === 'buff' ? '#8ed4ff' : '#ffaa88' }}>
                        {name}
                    </div>
                    <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>{description}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                        {remainingSec.toFixed(1)}s remaining
                    </div>
                </div>
            }
            placement="top"
            arrow={false}
            overlayStyle={{ zIndex: 10001 }}
            mouseEnterDelay={0.12}
        >
            <div
                style={{
                    width: SLOT_SIZE,
                    height: SLOT_SIZE,
                    borderRadius: 5,
                    border: borderByKind[kind],
                    background: kind === 'buff' ? 'rgba(40, 70, 95, 0.92)' : 'rgba(70, 35, 35, 0.92)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <img
                    src={icon}
                    alt={name}
                    width={22}
                    height={22}
                    draggable={false}
                    style={{ pointerEvents: 'none', imageRendering: 'pixelated' }}
                />
                <div
                    style={{
                        position: 'absolute',
                        right: 2,
                        bottom: 1,
                        fontSize: 9,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: '#fff',
                        textShadow: '0 1px 2px #000',
                        pointerEvents: 'none',
                    }}
                >
                    {label}
                </div>
            </div>
        </Tooltip>
    );
}

function buildEffectList(empowerEndsAt, debuffRows, now) {
    /** @type {Array<{ id: string, kind: 'buff'|'debuff', name: string, description: string, icon: string, remainingSec: number }>} */
    const buffs = [];
    const debuffs = [];

    if (now < empowerEndsAt) {
        const def = PLAYER_BUFF_DEFS.empower;
        buffs.push({
            id: 'empower',
            kind: 'buff',
            name: def.name,
            description: def.description,
            icon: def.icon,
            remainingSec: (empowerEndsAt - now) / 1000,
        });
    }

    for (const row of debuffRows) {
        const def = PLAYER_DEBUFF_DEFS[row.id];
        if (!def || row.remainingSec <= 0) continue;
        debuffs.push({
            id: row.id,
            kind: 'debuff',
            name: def.name,
            description: def.description,
            icon: def.icon,
            remainingSec: row.remainingSec,
        });
    }

    return [...buffs, ...debuffs];
}

/** Active buffs/debuffs centered above the HP bar. */
export default function BuffDebuffBar() {
    const empowerEndsAt = useGameStore((s) => s.empowerBuff?.endsAt ?? 0);
    const [now, setNow] = useState(() => performance.now());
    const [debuffRows, setDebuffRows] = useState(() => getActivePlayerDebuffsForUI());

    useEffect(() => {
        let frame;
        const tick = () => {
            setNow(performance.now());
            setDebuffRows(getActivePlayerDebuffsForUI());
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    const effects = useMemo(
        () => buildEffectList(empowerEndsAt, debuffRows, now),
        [empowerEndsAt, debuffRows, now]
    );

    if (!effects.length) return null;

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 6,
                minHeight: SLOT_SIZE,
            }}
        >
            {effects.map((effect) => (
                <StatusEffectSlot key={effect.id} effect={effect} />
            ))}
        </div>
    );
}
