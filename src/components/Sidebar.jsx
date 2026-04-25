// Sidebar.jsx - Fixed stats display
import { Menu, Badge, Avatar, Tooltip, Progress } from 'antd';
import {
    ShopOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    TrophyOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useGameStore } from '../stores/gameStore';

export default function Sidebar({ collapsed, onCollapse }) {
    const openShop = useGameStore(state => state.openShop);
    const player = useGameStore(state => state.player);
    const gold = useGameStore(state => state.inventory?.gold);
    const inventoryCount = useGameStore(state =>
        state.inventory?.slots?.filter(s => s !== null).length || 0
    );
    const kills = useGameStore(state => state.kills);

    const hpPercent = (player?.hp / player?.maxHp) * 100;
    const xpPercent = (player?.xp / player?.XPnext) * 100;

    const items = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: `Lvl ${player?.pLevel || 1}`,
        },
        {
            key: 'inventory',
            icon: <ShoppingCartOutlined />,
            label: 'Inventory',
            extra: <Badge count={inventoryCount} />,
        },
        {
            key: 'shop',
            icon: <ShopOutlined />,
            label: 'Shop',
            onClick: () => openShop(),
            extra: <span style={{ color: '#ffaa44' }}>💰 {gold || 0}</span>,
        },
        {
            key: 'game-stats',
            icon: <TrophyOutlined />,
            label: 'Statistics',
            children: [
                { key: 'kills', label: `👾 Kills: ${kills || 0}` },
                { key: 'deaths', label: '💀 Deaths: 0' },
                { key: 'playtime', label: '⏱️ Playtime: 0h' },
            ],
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            children: [
                { key: 'sound', label: '🔊 Sound Settings' },
                { key: 'controls', label: '🎮 Controls' },
            ],
        },
    ];

    if (collapsed) {
        return (
            <div style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
                height: '100%',
                width: 80,
                borderRight: '2px solid #ffaa44',
                padding: '20px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
            }}>
                <Tooltip title={`Level ${player?.pLevel || 1}`} placement="right">
                    <Avatar size={40} icon={<UserOutlined />} style={{ background: '#ffaa44', cursor: 'pointer' }} />
                </Tooltip>
                <Tooltip title="Inventory" placement="right">
                    <Badge count={inventoryCount}>
                        <Avatar size={40} icon={<ShoppingCartOutlined />} style={{ background: '#2a2a2a', cursor: 'pointer' }} />
                    </Badge>
                </Tooltip>
                <Tooltip title="Shop" placement="right">
                    <Avatar size={40} icon={<ShopOutlined />} style={{ background: '#ffaa44', cursor: 'pointer' }} onClick={openShop} />
                </Tooltip>
                <Tooltip title="Statistics" placement="right">
                    <Avatar size={40} icon={<TrophyOutlined />} style={{ background: '#2a2a2a', cursor: 'pointer' }} />
                </Tooltip>
                <Tooltip title="Settings" placement="right">
                    <Avatar size={40} icon={<SettingOutlined />} style={{ background: '#2a2a2a', cursor: 'pointer' }} />
                </Tooltip>
                <div style={{ marginTop: 'auto' }}>
                    <Tooltip title="Expand Sidebar" placement="right">
                        <div
                            onClick={() => onCollapse(false)}
                            style={{
                                width: 40,
                                height: 40,
                                background: '#ffaa44',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: 20,
                            }}
                        >
                            ▶
                        </div>
                    </Tooltip>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: 280,
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
            borderRight: '3px solid #ffaa44',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
        }}>
            {/* Player Stats Card - Custom section */}
            <div style={{
                padding: 20,
                textAlign: 'center',
                borderBottom: '2px solid #ffaa44',
                background: 'rgba(0,0,0,0.3)',
            }}>
                <Avatar size={64} icon={<UserOutlined />} style={{ background: '#ffaa44', marginBottom: 10 }} />
                <h3 style={{ color: '#ffaa44', margin: 0 }}>Adventurer</h3>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>Level {player?.pLevel || 1}</div>

                {/* Health Bar */}
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span>❤️ Health</span>
                        <span>{player?.hp || 0}/{player?.maxHp || 100}</span>
                    </div>
                    <Progress
                        percent={hpPercent}
                        showInfo={false}
                        strokeColor="#ff4444"
                        trailColor="rgba(255,255,255,0.1)"
                        size="small"
                    />
                </div>

                {/* XP Bar */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span>⭐ XP</span>
                        <span>{player?.xp || 0}/{player?.XPnext || 100}</span>
                    </div>
                    <Progress
                        percent={xpPercent}
                        showInfo={false}
                        strokeColor="#44aaff"
                        trailColor="rgba(255,255,255,0.1)"
                        size="small"
                    />
                </div>

                {/* Combat Stats */}
                <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,170,68,0.3)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    fontSize: 11,
                }}>
                    <div>
                        <div style={{ color: '#ffaa44' }}>⚔️ DMG</div>
                        <div style={{ fontWeight: 'bold' }}>{player?.stats?.damage || 10}</div>
                    </div>
                    <div>
                        <div style={{ color: '#ffaa44' }}>💨 SPD</div>
                        <div style={{ fontWeight: 'bold' }}>{player?.stats?.moveSpeed || 1}x</div>
                    </div>
                    <div>
                        <div style={{ color: '#ffaa44' }}>🎯 CRIT</div>
                        <div style={{ fontWeight: 'bold' }}>{player?.stats?.critChance || 5}%</div>
                    </div>
                    <div>
                        <div style={{ color: '#ffaa44' }}>💥 CRIT DMG</div>
                        <div style={{ fontWeight: 'bold' }}>{player?.stats?.critDamage || 100}%</div>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <Menu
                mode="inline"
                theme="dark"
                items={items}
                style={{ flex: 1, background: 'transparent', border: 'none' }}
                onClick={(item) => {
                    if (item.key === 'inventory') {
                        const btn = document.querySelector('.inventory-toggle');
                        if (btn) btn.click();
                    }
                }}
            />

            {/* Footer */}
            <div style={{
                padding: 16,
                textAlign: 'center',
                borderTop: '1px solid rgba(255,170,68,0.3)',
                fontSize: 11,
                color: '#888',
                background: 'rgba(0,0,0,0.2)',
            }}>
                <div>🎮 B: Shop | I: Inventory</div>
                <div
                    onClick={() => onCollapse(true)}
                    style={{ cursor: 'pointer', marginTop: 8, color: '#ffaa44', fontSize: 12 }}
                >
                    Collapse ◀
                </div>
            </div>
        </div>
    );
}