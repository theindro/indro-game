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
import { useGameStore } from '../../stores/gameStore.js';
import { audioManager } from "../../game/utils/audioManager.js";
import { ItemDatabase } from "../../game/items.js";
import ItemCard from "../Items/ItemCard.jsx";

const { Text } = Typography;

const EQUIPMENT_LAYOUT = [
    [null, 'helmet', null],
    ['weapon', 'chest', 'gloves'],
    [null, 'pants', null],
    ['amulet', 'boots', 'ring'],
];

const Character = ({isOpen, setIsOpen}) => {
    const [messageApi, contextHolder] = message.useMessage();

    const inventory = useGameStore((s) => s.inventory);
    const playerLevel = useGameStore((s) => s.player.pLevel);
    const playerMaxHp = useGameStore((s) => s.player.maxHp);
    const playerStats = useGameStore((s) => s.player.stats);

    const unequipItem = useGameStore((s) => s.unequipItem);
    const dismantleEquippedItem = useGameStore((s) => s.dismantleEquippedItem);

    useEffect(() => {
        if (isOpen) audioManager.playSFX('/sounds/open-close.mp3', 0.15);
    }, [isOpen]);

    const handleUnequip = (slotKey) => {
        const item = inventory?.equipment?.[slotKey];
        if (!item) return;

        if (unequipItem(slotKey)) {
            const name = ItemDatabase[item?.id]?.name ?? 'item';
            messageApi.info(`Unequipped ${name}`, 1.5);
        } else {
            messageApi.warning('Inventory is full', 1.5);
        }
    };

    const handleEquipAction = (actionKey, slotKey) => {
        const equipped = inventory?.equipment?.[slotKey];
        if (!equipped) return;

        if (actionKey === 'dismantle') {
            const res = dismantleEquippedItem(slotKey);
            if (res.ok) {
                const name = ItemDatabase[res.itemId]?.name ?? 'Item';
                messageApi.success(`Dismantled ${name} (+${res.essence} void essence)`, 1.8);
            }
            return;
        }
        if (actionKey === 'equip' || actionKey === 'drop') {
            handleUnequip(slotKey);
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
                className="bottom-right-float-card"
                styles={{
                    body: { padding: 0 },
                    header: { display: 'none' }
                }}
            >
                <Row>
                    {/* Stats Column */}
                    <Col span={8} style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Text strong style={{ fontSize: 15 }}>
                                Level {playerLevel || 1}
                            </Text>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                <Row justify="space-between"><Text type="secondary">Damage</Text><Text strong>{playerStats.damage}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Health</Text><Text strong>{playerMaxHp}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Attack CD (s)</Text><Text strong>{playerStats.attackCooldown?.toFixed(2)}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Attack range (px)</Text><Text strong>{Math.round(playerStats.attackRange ?? 0)}</Text></Row>
                                <Row justify="space-between"><Text type="secondary">Projectile speed</Text><Text strong>{playerStats.projectileSpeed?.toFixed(2)}</Text></Row>
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
                                        {row.map((slotKey, ci) => {
                                            const equipped = equipment[slotKey];
                                            const dbItem = equipped ? ItemDatabase[equipped.id] : null;
                                            return (
                                                <Col key={ci}>
                                                    {slotKey ? (
                                                        <div style={{ textAlign: 'center' }}>
                                                            {equipped && dbItem ? (
                                                            <ItemCard
                                                                slot={equipped}
                                                                item={dbItem}
                                                                enchantLevel={equipped.enchantLevel}
                                                                onClick={() => handleUnequip(slotKey)}
                                                                onAction={(actionKey) => handleEquipAction(actionKey, slotKey)}
                                                            />
                                                            ) : (
                                                                <div key={slotKey} className="item-card">-</div>
                                                            )}

                                                            <div style={{ marginTop: 6, fontSize: 10, color: '#666', textTransform: 'uppercase' }}>
                                                                {slotKey}
                                                            </div>
                                                        </div>
                                                    ) : <div style={{ width: 54, height: 54 }} />}
                                                </Col>
                                            )
                                        })}
                                    </Row>
                                ))}
                            </Space>
                        </div>

                        <Divider style={{ margin: 0 }} />
                        <div style={{ padding: '10px', textAlign: 'center', fontSize: 12, color: '#666' }}>
                            Click to unequip · Right-click for dismantle
                        </div>
                    </Col>
                </Row>
            </Card>
        </>
    );
}

export default Character;