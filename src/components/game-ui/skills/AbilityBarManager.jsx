import React from 'react';
import { Typography, Switch, Tag, message } from 'antd';
import { useGameStore, INITIAL_ABILITIES } from '../../../stores/gameStore.js';
import { ALL_ABILITY_KEYS, countEquippedAbilities, isAbilityEquipped, normalizeAbilityBarLayout } from '../../../game/abilities/abilityBarLayout.js';

const { Text, Title } = Typography;

/**
 * Pick which unlocked abilities are on the 6 hotkey slots (Skills panel).
 */
export default function AbilityBarManager() {
    const skillUnlocks = useGameStore((s) => s.skillUnlocks);
    const abilityBarLayout = useGameStore((s) => s.abilityBarLayout);
    const toggleAbilityEquipped = useGameStore((s) => s.toggleAbilityEquipped);

    const layout = normalizeAbilityBarLayout(abilityBarLayout, skillUnlocks);
    const equippedCount = countEquippedAbilities(layout);

    const unlockedKeys = ALL_ABILITY_KEYS.filter((key) => skillUnlocks?.[key]);

    if (unlockedKeys.length === 0) {
        return (
            <Text type="secondary" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Unlock abilities in the tree to equip them on keys 1–6.
            </Text>
        );
    }

    return (
        <div
            style={{
                marginTop: 20,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.12)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Title level={5} style={{ margin: 0, color: '#fff' }}>
                    Ability bar loadout
                </Title>
                <Tag color={equippedCount >= 6 ? 'orange' : 'purple'}>
                    {equippedCount} / 6 active
                </Tag>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, display: 'block', marginBottom: 12 }}>
                Toggle which unlocked skills appear on hotkeys 1–6. New unlocks auto-fill the next empty slot.
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unlockedKeys.map((abilityKey) => {
                    const def = INITIAL_ABILITIES[abilityKey];
                    const onBar = isAbilityEquipped(layout, abilityKey);
                    const barFull = equippedCount >= 6 && !onBar;

                    return (
                        <div
                            key={abilityKey}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: onBar ? 'rgba(182, 116, 255, 0.12)' : 'transparent',
                            }}
                        >
                            <img src={def.icon} alt="" width={28} height={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{ color: '#fff', fontSize: 13 }}>
                                    {def.name}
                                </Text>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                                    CD {def.maxCooldown}s
                                </div>
                            </div>
                            <Switch
                                checked={onBar}
                                disabled={barFull}
                                onChange={() => {
                                    const res = toggleAbilityEquipped(abilityKey);
                                    if (!res.ok) {
                                        if (res.reason === 'bar_full') {
                                            message.warning('Bar full — disable another ability first');
                                        }
                                        return;
                                    }
                                    message.success(
                                        res.equipped
                                            ? `${def.name} added to bar`
                                            : `${def.name} removed from bar`
                                    );
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
