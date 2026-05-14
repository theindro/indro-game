import React, {useCallback, useEffect, useRef, useState} from 'react';
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
import {ItemDatabase} from "../../game/items.js";
import ItemCard from "../Items/ItemCard.jsx";

const { Text } = Typography;

export default function Inventory({isOpen, setIsOpen}) {
    const [messageApi, contextHolder] = message.useMessage();

    const inventory = useGameStore((s) => s.inventory);

    const equipItem = useGameStore((s) => s.equipItem);
    const removeItem = useGameStore((s) => s.removeItem);
    const sellItem = useGameStore((s) => s.sellItem);
    const [lootPopup, setLootPopup] = useState(null);
    const prevSlotsRef = useRef([]);

    useEffect(() => {
        const prev = prevSlotsRef.current;
        const current = inventory?.slots || [];

        if (!prev.length) {
            prevSlotsRef.current = current;
            return;
        }

        const changes = [];

        for (let i = 0; i < current.length; i++) {
            const prevItem = prev[i];
            const currItem = current[i];

            if (!currItem) continue;

            // new item
            if (!prevItem && currItem) {
                changes.push({
                    id: currItem.id,
                    quantity: currItem.quantity,
                });
            }

            // quantity increase
            if (prevItem && currItem && currItem.quantity > prevItem.quantity) {
                changes.push({
                    id: currItem.id,
                    quantity: currItem.quantity - prevItem.quantity,
                });
            }
        }

        if (changes.length > 0) {
            const first = changes[0];
            setLootPopup(first);

            setTimeout(() => {
                setLootPopup(null);
            }, 1500);
        }

        prevSlotsRef.current = current;
    }, [inventory?.slots]);

    useEffect(() => {
        if (isOpen) audioManager.playSFX('/sounds/open-close.mp3', 0.15);
    }, [isOpen]);

    const handleEquip = (slotWrapper, slotIndex) => {
        if (!slotWrapper?.id) return;

        const dbItem = ItemDatabase[slotWrapper.id];

        if (dbItem?.equipSlot) {
            equipItem(slotWrapper, slotIndex);
            messageApi.success(`Equipped ${dbItem.name}`, 1.5);
        } else {
            messageApi.warning(`${dbItem?.name ?? 'Item'} cannot be equipped`, 1.5);
        }
    };

    const slots = inventory?.slots || [];

    const handleAction = useCallback((actionKey, slotPayload, slotIndex) => {
        if (actionKey === 'equip') equipItem(slotPayload, slotIndex);
        if (actionKey === 'sell') sellItem(slotIndex);
        if (actionKey === 'drop') removeItem(slotIndex);
        if (actionKey === 'craft') console.log('craft', slotPayload);
    }, [equipItem, sellItem, removeItem]);

    console.log('rerendering inventory');

    return (
        <>
            {lootPopup && (
                <div
                    style={{
                        position: 'fixed',
                        top: '40%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        padding: '10px 14px',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: '#fff',
                        fontWeight: 600,
                        zIndex: 99999,
                        animation: 'fadeUp 1.5s ease-out'
                    }}

                    className={"loot-card " + ItemDatabase[lootPopup.id]?.rarity?.name}
                >
                    <img
                        src={ItemDatabase[lootPopup.id]?.texture}
                        width={28}
                        height={28}
                    />
                    <span>
                        +{lootPopup.quantity} {ItemDatabase[lootPopup.id]?.name}
                    </span>
                </div>
            )}

            {contextHolder}

            {isOpen && (
                <Card
                    style={{width: 300}}
                    className="bottom-right-float-card"
                    styles={{
                        body: { padding: 0 },
                        header: { display: 'none' }
                    }}
                >
                    <Row>
                        <Col span={24}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
                                <Text strong>
                                    Inventory
                                </Text>
                                <Text type="secondary">
                                    {slots.filter(Boolean).length} / {slots.length}
                                </Text>
                            </div>

                            <div style={{ padding: '20px' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: 10,
                                }}>
                                    {slots.map((item, i) => {
                                        if (!item) return <div key={i} className="item-card">-</div>

                                        const dbItem = ItemDatabase[item?.id];

                                        return (
                                            <ItemCard
                                                key={i}
                                                slot={item}
                                                inventorySlotIndex={i}
                                                quantity={item?.quantity}
                                                enchantLevel={item?.enchantLevel}
                                                item={dbItem}
                                                onClick={handleEquip}
                                                onAction={(actionKey, slotPayload) =>
                                                    handleAction(actionKey, slotPayload, i)
                                                }
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}
        </>
    );
}
