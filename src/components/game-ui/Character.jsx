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
import ItemCard from "../Items/ItemCard.jsx";

const { Text } = Typography;

const EQUIPMENT_LAYOUT = [
    [null, 'helmet', null],
    ['gloves', 'chest', 'weapon'],
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
                                        {row.map((slotKey, ci) => {
                                            let dbItem = equipment[slotKey];
                                            console.log(dbItem);
                                            return (
                                                <Col key={ci}>
                                                    {slotKey ? (
                                                        <div style={{ textAlign: 'center' }}>
                                                            {dbItem ? (

                                                            <ItemCard
                                                                slotKey={slotKey}
                                                                item={dbItem}
                                                                slot={dbItem}
                                                                onClick={() => handleUnequip(slotKey)}
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
                            Right-click to unequip
                        </div>
                    </Col>
                </Row>
            </Card>
        </>
    );
}

export default Character;