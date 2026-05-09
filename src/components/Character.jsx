import React, { useEffect, useState } from 'react';
import {
    Card,
    Tooltip,
    message,
    Row,
    Col,
    Divider,
    Space,
    Typography,
    Badge,
} from 'antd';
import { useGameStore } from '../stores/gameStore';
import { audioManager } from "../game/utils/audioManager.js";

const { Text } = Typography;

const ABILITY_UNLOCK_LEVELS = { /* not needed here */ };

const STAT_LABELS = {
    damage: { label: 'DMG', color: '#e8a825' },
    chest: { label: 'ARM', color: '#7f77dd' },
    attackSpeed: { label: 'ASPD', color: '#3b9e75' },
    critChance: { label: 'CRIT', color: '#e06b6b' },
    moveSpeed: { label: 'SPD', color: '#4fc3f7' },
    projectiles: { label: 'PROJ', color: '#ce93d8' },
    health: { label: 'HP', color: '#3b9e75' },
};

const EQUIPMENT_LAYOUT = [
    [null, 'helmet', null],
    ['gloves', 'chest', 'weapon'],
    [null, 'pants', null],
    ['amulet', 'boots', 'ring'],
];

function StatPill({ statKey, value }) {
    const def = STAT_LABELS[statKey];
    if (!def || !value) return null;

    const display = statKey === 'moveSpeed'
        ? `+${Math.floor(value * 100)}%`
        : `+${value}`;

    return (
        <Badge
            color={def.color}
            text={
                <span style={{ color: def.color, fontSize: 12, fontWeight: 600 }}>
                    {display} {def.label}
                </span>
            }
        />
    );
}

function ItemTooltip({ item, sellPrice, showSell }) {
    if (!item) return null;

    return (
        <div style={{ minWidth: 180 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: item?.rarity?.color || '#fff' }}>
                {item.name}
            </div>

            {item.description && (
                <div style={{ fontSize: 12, color: '#aaa', margin: '6px 0' }}>
                    {item.description}
                </div>
            )}

            <Space direction="vertical" size={2}>
                {Object.entries(item.stats || {}).map(([key, val]) =>
                    val ? <StatPill key={key} statKey={key} value={val} /> : null
                )}
            </Space>

            {showSell && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                    Click to equip • Right-click to sell for <Text type="warning">{sellPrice}g</Text>
                </div>
            )}
        </div>
    );
}

function EquipSlot({ slotKey, item, onUnequip }) {
    const accentColor = item?.rarity?.color || '#333';

    return (
        <Tooltip
            title={item ? <ItemTooltip item={item} showSell={false} /> : null}
            placement="right"
            arrow={false}
        >
            <div
                onContextMenu={(e) => { e.preventDefault(); if (item) onUnequip(slotKey); }}
                style={{
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    background: item ? `${accentColor}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item ? accentColor : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: item ? 'pointer' : 'default',
                    position: 'relative',
                }}
            >
                {item?.texture ? (
                    <img src={item.texture} alt={item.name} width={34} height={34} />
                ) : (
                    <span style={{ fontSize: 24, opacity: 0.2 }}>•</span>
                )}

                {item && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: accentColor,
                    }} />
                )}
            </div>
        </Tooltip>
    );
}

const Character = ({isOpen, setIsOpen}) => {
    const [messageApi, contextHolder] = message.useMessage();

    const inventory = useGameStore((s) => s.inventory);
    const playerLevel = useGameStore((s) => s.player.pLevel);
    const playerMaxHp = useGameStore((s) => s.player.maxHp);
    const playerStats = useGameStore((s) => s.player.stats);

    const unequipItem = useGameStore((s) => s.unequipItem);

    useEffect(() => {
        if (isOpen) audioManager.playSFX('/sounds/open-close.mp3', 0.15);
    }, [isOpen]);

    const handleUnequip = (slotKey) => {
        const item = inventory?.equipment?.[slotKey];
        if (!item) return;

        if (unequipItem(slotKey)) {
            messageApi.info(`Unequipped ${item.name}`, 1.5);
        } else {
            messageApi.warning('Inventory is full', 1.5);
        }
    };

    if (!isOpen) return <>{contextHolder}</>;

    const slots = inventory?.slots || [];
    const equipment = inventory?.equipment || {};

    console.log('rerendering character bar');

    return (
        <>
            {contextHolder}

            <Card
                style={{
                    position: 'fixed',
                    bottom: 100,
                    right: 24,
                    width: 700,
                    zIndex: 10000,
                    background: 'rgba(10, 12, 16, 0.92)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                }}
                styles={{
                    body: { padding: 0 },
                    header: { display: 'none' }
                }}
            >
                <Row>
                    {/* Stats Column */}
                    <Col span={8} style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Text strong style={{ fontSize: 15, color: '#ddd' }}>
                                Level {playerLevel || 1}
                            </Text>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                <Row justify="space-between"><Text type="secondary">Damage</Text><Text strong>{playerStats.damage}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Health</Text><Text strong>{playerMaxHp}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Atk Speed</Text><Text strong>{playerStats.attackSpeed?.toFixed(2)}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Move Speed</Text><Text strong>{playerStats.moveSpeed}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Crit Chance</Text><Text strong>{playerStats.critChance}%</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Crit Damage</Text><Text strong>{playerStats.critDamage}%</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Projectiles</Text><Text strong>{playerStats.projectiles}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Armor</Text><Text strong>{playerStats.armor || 0}</Text></Row>
                            </Space>
                        </div>
                    </Col>

                    {/* Equipment Column */}
                    <Col span={16} style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Text strong>Equipment</Text>
                        </div>

                        <div style={{ padding: '24px 20px' }}>
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                {EQUIPMENT_LAYOUT.map((row, ri) => (
                                    <Row key={ri} justify="center" gutter={[12, 12]}>
                                        {row.map((slotKey, ci) => (
                                            <Col key={ci}>
                                                {slotKey ? (
                                                    <div style={{ textAlign: 'center' }}>
                                                        <EquipSlot
                                                            slotKey={slotKey}
                                                            item={equipment[slotKey]}
                                                            onUnequip={handleUnequip}
                                                        />
                                                        <div style={{ marginTop: 6, fontSize: 10, color: '#666', textTransform: 'uppercase' }}>
                                                            {slotKey}
                                                        </div>
                                                    </div>
                                                ) : <div style={{ width: 54, height: 54 }} />}
                                            </Col>
                                        ))}
                                    </Row>
                                ))}
                            </Space>
                        </div>

                        <Divider style={{ margin: 0 }} />
                        <div style={{ padding: '10px', textAlign: 'center', fontSize: 12, color: '#666' }}>
                            Right-click to unequip
                        </div>
                    </Col>
                </Row>

                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 18,
                        background: 'none',
                        border: 'none',
                        fontSize: 18,
                        color: '#888',
                        cursor: 'pointer',
                    }}
                >
                    ✕
                </button>
            </Card>
        </>
    );
}

export default Character;