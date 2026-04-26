// components/Inventory.jsx
import {useEffect, useState} from 'react';
import {Drawer, Card, Row, Col, Tooltip, Badge, Button, Space, Typography, Divider, message} from 'antd';
import {
    ShoppingCartOutlined,
    GoldOutlined,
    CloseOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {useGameStore} from '../stores/gameStore';

const {Text, Title} = Typography;

export default function Inventory() {
    const [isOpen, setIsOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const inventory = useGameStore((state) => state.inventory);
    const equipItem = useGameStore((state) => state.equipItem);
    const sellItem = useGameStore((state) => state.sellItem);
    const unequipItem = useGameStore((state) => state.unequipItem);

    console.log(inventory);

    const handleKeyPress = (e) => {
        if (e.key === 'i' || e.key === 'I') {
            setIsOpen(!isOpen);
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen]);

    // Equipment slots in grid order (3x4 grid)
    const equipmentGrid = [
        // Row 1
        { key: '25', label: '', icon: '', row: 0, col: 0 },
        { key: 'helmet', label: 'Helmet', icon: '', row: 0, col: 1 },
        { key: '123', label: '', icon: '', row: 0, col: 2 },

        // Row 2
        { key: 'gloves', label: 'Gloves', icon: '', row: 1, col: 0 },
        { key: 'armor', label: 'Armor', icon: '', row: 1, col: 1 },
        { key: 'weapon', label: 'Weapon', icon: '', row: 1, col: 2 },

        // Row 3
        { key: '66', label: '', icon: '', row: 2, col: 0 },
        { key: 'pants', label: 'Pants', icon: '', row: 2, col: 1 },
        { key: '632', label: '', icon: '', row: 2, col: 2 },
        // Row 4
        { key: 'amulet', label: 'Amulet', icon: '', row: 2, col: 0 },
        { key: 'boots', label: 'Boots', icon: '', row: 2, col: 1 },
        { key: 'ring', label: 'Ring', icon: '', row: 2, col: 2 },
    ];


    const renderEquipmentSlot = (slot) => {
        const item = inventory?.equipment?.[slot.key];

        const handleUnequip = () => {
            if (item) {
                const success = unequipItem(slot.key);
                if (success) {
                    messageApi.success(`Unequipped ${item.name}`);
                } else {
                    messageApi.warning('Inventory full! Cannot unequip.');
                }
            }
        };

        return (
            <div
                style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    background: item ? `${item?.rarity?.color}1a` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${item ? item?.rarity?.color : '#333'}`,
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: item ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    position: 'relative',
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (item) handleUnequip();
                }}
            >
                {getItemImage(item) && (
                    <img
                        src={getItemImage(item)}
                        alt={item.name}
                        style={{
                            width: 48,
                            height: 48,
                            marginBottom: 4,
                            objectFit: 'contain'
                        }}
                    />
                )}
                {item && (
                    <Tooltip title={
                        <div>
                            <div><strong>{item.name}</strong></div>
                            <div style={{fontSize: 11}}>{item.description}</div>
                            {item.stats?.damage && <div>⚔️ +{item.stats.damage} DMG</div>}
                            {item.stats?.armor && <div>🛡️ +{item.stats.armor} ARM</div>}
                            {item.stats?.attackSpeed && <div>⚡ +{item.stats.attackSpeed} ASPD</div>}
                            {item.stats?.critChance && <div>🎯 +{item.stats.critChance}% CRIT</div>}
                            {item.stats?.moveSpeed && <div>💨 +{Math.floor(item.stats.moveSpeed * 100)}% SPD</div>}
                            {item.stats?.projectiles && <div>🏹 +{item.stats.projectiles} PROJ</div>}
                            <div style={{marginTop: 8, color: '#ffaa44'}}>Right-click to unequip</div>
                        </div>
                    }>
                        <div style={{
                            fontSize: 9,
                            color: item?.rarity?.color,
                            marginTop: 2,
                            textAlign: 'center',
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {item.name}
                        </div>
                    </Tooltip>
                )}
            </div>
        );
    };

    const handleEquipItem = (index) => {
        const item = inventory?.slots?.[index];

        if (item && item.equipSlot) {
            equipItem(index);
            messageApi.success(`Equipped ${item.name}`);
        } else if (item) {
            messageApi.warning(`${item.name} cannot be equipped`);
        }
    };

    const handleSellItem = (index) => {
        const item = inventory?.slots?.[index];
        if (item) {
            const sellPrice = Math.floor(item.price * 0.5);
            sellItem(index);
            messageApi.success(`Sold ${item.name} for ${sellPrice} gold`);
        }
    };

    // Inside your component, add a function to get item image
    const getItemImage = (item) => {
        if (!item) return null;

        // Use the texture URL directly if it exists
        if (item.texture) {
            // Ensure the path starts with /assets if needed
            const imageUrl = item.texture;

            return imageUrl;
        }

        return null;
    };

    console.log('rerenderrr inventory')

    const inventoryItems = inventory?.slots || [];

    return (
        <>
            {contextHolder}

            <Button
                className="inventory-toggle"
                style={{display: 'none'}}
                onClick={() => setIsOpen(true)}
            />

            <Drawer
                title={
                    <Space>
                        <ShoppingCartOutlined style={{color: '#ffaa44'}}/>
                        <span style={{color: '#ffaa44'}}>Inventory</span>
                        <Badge
                            count={inventory?.slots?.filter(s => s !== null).length || 0}
                            style={{backgroundColor: '#ffaa44'}}
                        />
                    </Space>
                }
                placement="right"
                open={isOpen}
                onClose={() => setIsOpen(false)}
                width={520}
                styles={{
                    body: {
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        padding: '16px',
                    },
                    header: {
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        borderBottom: '2px solid #ffaa44',
                    },
                }}
                closeIcon={<CloseOutlined style={{color: '#ffaa44'}}/>}
            >
                {/* Equipment Grid */}
                <Title level={5} style={{color: '#ffaa44', marginBottom: 8}}>
                    ⚔️ Equipment
                </Title>
                <div style={{
                    margin: "auto",
                    maxWidth: 280,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    marginBottom: 20,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 12,
                    padding: 12,
                }}>
                    {equipmentGrid.map((slot) => (
                        <div key={slot.key}>
                            {renderEquipmentSlot(slot)}
                            <Text style={{
                                color: '#aaa',
                                fontSize: 9,
                                marginTop: 4,
                                display: 'block',
                                textAlign: 'center'
                            }}>
                                {slot.label}
                            </Text>
                        </div>
                    ))}
                </div>

                <Divider style={{borderColor: 'rgba(255,170,68,0.3)', margin: '12px 0'}}/>

                {/* Inventory Grid - 6 columns */}
                <Row gutter={[8, 8]}>
                    {inventoryItems.map((item, index) => (
                        <Col span={4} key={index}>
                            <Card
                                hoverable={!!item}
                                size="small"
                                style={{
                                    background: item ? `${item?.rarity?.color}1a` : 'rgba(0,0,0,0.3)',
                                    border: `1px solid ${item ? item?.rarity?.color : '#333'}`,
                                    cursor: item ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    height: 120
                                }}
                                bodyStyle={{padding: '8px 4px', textAlign: 'center'}}
                                onClick={() => item && handleEquipItem(index)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (item) handleSellItem(index);
                                }}
                            >
                                {item ? (
                                    <div>
                                        {getItemImage(item) ? (
                                            <img
                                                src={getItemImage(item)}
                                                alt={item.name}
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    marginBottom: 4,
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: 28, marginBottom: 4 }}>
                                                {'X'}
                                            </div>
                                        )}
                                        <Tooltip title={
                                            <div>
                                                <div><strong>{item.name}</strong></div>
                                                <div style={{fontSize: 11, color: '#aaa'}}>{item.description}</div>
                                                {item.stats?.damage && <div>⚔️ +{item.stats.damage} DMG</div>}
                                                {item.stats?.armor && <div>🛡️ +{item.stats.armor} ARM</div>}
                                                {item.stats?.attackSpeed && <div>⚡ +{item.stats.attackSpeed} ASPD</div>}
                                                {item.stats?.critChance && <div>🎯 +{item.stats.critChance}% CRIT</div>}
                                                {item.stats?.moveSpeed &&
                                                    <div>💨 +{Math.floor(item.stats.moveSpeed * 100)}% SPD</div>}
                                                {item.stats?.projectiles && <div>🏹 +{item.stats.projectiles} PROJ</div>}
                                                <div style={{marginTop: 8, color: '#ffaa44'}}>
                                                    Sell: 💰 {Math.floor(item.price * 0.5)}
                                                </div>
                                                <div style={{marginTop: 4, fontSize: 10, color: '#888'}}>
                                                    Click to equip
                                                </div>
                                            </div>
                                        }>
                                            <Text strong style={{color: item?.rarity?.color, fontSize: 10}}>
                                                {item.name.length > 10 ? item.name.slice(0, 8) + '..' : item.name}
                                            </Text>
                                        </Tooltip>
                                        {item.quantity > 1 && (
                                            <Badge
                                                count={`x${item.quantity}`}
                                                style={{
                                                    backgroundColor: '#ffaa44',
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    fontSize: 9,
                                                    minWidth: 18,
                                                    height: 18,
                                                    lineHeight: '18px',
                                                }}
                                            />
                                        )}
                                        {item.stats?.damage && (
                                            <div style={{fontSize: 9, color: '#ff8866', marginTop: 2}}>
                                                ⚔️ +{item.stats.damage}
                                            </div>
                                        )}
                                        {item.stats?.armor && (
                                            <div style={{fontSize: 9, color: '#88aaff', marginTop: 2}}>
                                                🛡️ +{item.stats.armor}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{color: '#555', padding: '12px 0'}}>
                                        <div style={{fontSize: 20}}>⬚</div>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Footer */}
                <div style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,170,68,0.3)',
                    textAlign: 'center',
                }}>
                    <Text type="secondary" style={{fontSize: 10}}>
                        💡 Click to equip • Right-click to sell
                    </Text>
                </div>
            </Drawer>
        </>
    );
}