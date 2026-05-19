import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Card,
    Tooltip,
    message,
    Row,
    Col,
    Space,
    Typography,
    Button,
    Popconfirm,
} from 'antd';
import {SortAscendingOutlined, ScissorOutlined, DeleteOutlined} from '@ant-design/icons';
import { useGameStore } from '../../stores/gameStore.js';
import { audioManager } from "../../game/utils/audioManager.js";
import {ItemDatabase} from "../../game/items.js";
import ItemCard from "../Items/ItemCard.jsx";

const { Text } = Typography;

const LOOT_TOAST_DURATION_MS = 3200;
const MAX_LOOT_TOASTS = 12;

function mergeLootChanges(changes) {
    const byId = new Map();
    for (const c of changes) {
        byId.set(c.id, (byId.get(c.id) ?? 0) + c.quantity);
    }
    return [...byId.entries()].map(([id, quantity]) => ({ id, quantity }));
}

function LootToast({ toast, onExpire }) {
    const dbItem = ItemDatabase[toast.itemId];
    const rarityName = dbItem?.rarity?.name ?? '';

    useEffect(() => {
        const timer = setTimeout(() => onExpire(toast.key), LOOT_TOAST_DURATION_MS);
        return () => clearTimeout(timer);
    }, [toast.key, onExpire]);

    return (
        <div className={`loot-card loot-toast ${rarityName}`}>
            {dbItem?.texture ? (
                <img src={dbItem.texture} width={28} height={28} alt="" />
            ) : null}
            <span>
                +{toast.quantity} {dbItem?.name ?? toast.itemId}
            </span>
        </div>
    );
}

export default function Inventory({ isOpen, setIsOpen }) {
    const [messageApi, contextHolder] = message.useMessage();

    const inventory = useGameStore((s) => s.inventory);

    const equipItem = useGameStore((s) => s.equipItem);
    const sellItem = useGameStore((s) => s.sellItem);
    const dropItemFromSlot = useGameStore((s) => s.dropItemFromSlot);
    const sortInventory = useGameStore((s) => s.sortInventory);
    const dismantleInventorySlot = useGameStore((s) => s.dismantleInventorySlot);
    const dismantleAllGearInBag = useGameStore((s) => s.dismantleAllGearInBag);
    const openEnchantmentUI = useGameStore((s) => s.openEnchantmentUI);
    const playerLocation = useGameStore((s) => s.player.location);
    const [lootToasts, setLootToasts] = useState([]);
    const prevSlotsRef = useRef([]);
    const toastKeyRef = useRef(0);

    const dismissLootToast = useCallback((key) => {
        setLootToasts((prev) => prev.filter((t) => t.key !== key));
    }, []);

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
            const merged = mergeLootChanges(changes);
            const incoming = merged.map((entry) => ({
                key: ++toastKeyRef.current,
                itemId: entry.id,
                quantity: entry.quantity,
            }));
            setLootToasts((prev) => [...prev, ...incoming].slice(-MAX_LOOT_TOASTS));
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
        if (actionKey === 'equip') {
            equipItem(slotPayload, slotIndex);
            return;
        }
        if (actionKey === 'sell') {
            sellItem(slotIndex);
            return;
        }
        if (actionKey === 'enchant') {
            openEnchantmentUI(slotIndex);
            messageApi.info('Opened Enchantment tab', 1.2);
            return;
        }
        if (actionKey === 'drop') {
            const loc = playerLocation ?? { x: 0, y: 0 };
            const dropped = dropItemFromSlot(slotIndex, loc.x, loc.y);
            if (dropped) {
                const name = ItemDatabase[dropped.id]?.name ?? 'Item';
                messageApi.success(`Dropped ${name}`, 1.2);
            }
            return;
        }
        if (actionKey === 'dismantle') {
            const res = dismantleInventorySlot(slotIndex);
            if (res.ok) {
                const name = ItemDatabase[res.itemId]?.name ?? 'Item';
                messageApi.success(
                    `Dismantled ${res.quantity > 1 ? `${res.quantity}× ` : ''}${name} (+${res.essence} void essence)`,
                    1.8
                );
            } else if (res.reason === 'not_gear') {
                messageApi.warning('Only equipment can be dismantled', 1.5);
            }
        }
    }, [
        equipItem,
        sellItem,
        dropItemFromSlot,
        dismantleInventorySlot,
        openEnchantmentUI,
        playerLocation,
        messageApi,
    ]);

    const handleSort = () => {
        sortInventory();
        messageApi.success('Inventory sorted', 1);
    };

    const handleDismantleAll = () => {
        const res = dismantleAllGearInBag();
        if (res.ok) {
            messageApi.success(
                `Dismantled ${res.count} item${res.count !== 1 ? 's' : ''} (+${res.essence} void essence)`,
                2
            );
        } else {
            messageApi.info('No equipment in bag to dismantle', 1.5);
        }
    };

    return (
        <>
            {lootToasts.length > 0 && (
                <div className="loot-toast-stack">
                    {lootToasts.map((toast) => (
                        <LootToast
                            key={toast.key}
                            toast={toast}
                            onExpire={dismissLootToast}
                        />
                    ))}
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
                            <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                            }}>
                                <Space size={6}>
                                    <Text strong>Inventory</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {slots.filter(Boolean).length} / {slots.length}
                                    </Text>
                                </Space>
                                <Space size={4}>
                                    <Tooltip title="Sort by rarity" overlayStyle={{zIndex: 10001}}>
                                        <Button
                                            size="small"
                                            type="text"
                                            icon={<SortAscendingOutlined />}
                                            onClick={handleSort}
                                            style={{ color: 'rgba(255,255,255,0.65)' }}
                                        />
                                    </Tooltip>
                                    <Popconfirm
                                        overlayStyle={{zIndex: 10001}}
                                        title="Dismantle all gear in bag?"
                                        description="Converts equipment to void essence. Materials are kept."
                                        onConfirm={handleDismantleAll}
                                        okText="Dismantle"
                                        cancelText="Cancel"
                                    >
                                        <Tooltip title="Dismantle all equipment" overlayStyle={{zIndex: 10001}}>
                                            <Button
                                                size="small"
                                                type="text"
                                                icon={<DeleteOutlined />}
                                            />
                                        </Tooltip>
                                    </Popconfirm>
                                </Space>
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
