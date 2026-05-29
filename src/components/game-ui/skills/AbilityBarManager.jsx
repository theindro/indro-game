import React from 'react';
import {Typography, Switch, Tag, message, Card, Row} from 'antd';
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
            <Text type="secondary" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Unlock abilities in the tree to equip them on keys 1–6.
            </Text>
        );
    }

    return (
        <div
            style={{
                marginTop: 20,
                borderRadius: 8,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Title level={5} style={{ margin: 0 }}>
                    Ability bar loadout
                </Title>
                <Tag color={equippedCount >= 6 ? 'orange' : 'purple'}>
                    {equippedCount} / 6 active
                </Tag>
            </div>
            <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, display: 'block', marginBottom: 12 }}>
                Toggle which unlocked skills appear on hotkeys 1–6. New unlocks auto-fill the next empty slot.
            </Text>

            <Row type="flex"
            style={{gap: 8}}>
                {unlockedKeys.map((abilityKey) => {
                    const def = INITIAL_ABILITIES[abilityKey];
                    const onBar = isAbilityEquipped(layout, abilityKey);
                    const barFull = equippedCount >= 6 && !onBar;

                    return (
                        <Card
                            key={abilityKey}

                        >
                            <img src={def.icon} alt="" width={28} height={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{fontSize: 13 }}>
                                    {def.name}
                                </Text>
                                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
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
                        </Card>
                    );
                })}
            </Row>
        </div>
    );
}
