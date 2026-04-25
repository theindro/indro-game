// GameHeader.jsx
import { Progress, Typography, Space, Badge, theme } from 'antd';
import {
    TrophyOutlined,
    HeartOutlined,
    GoldOutlined,
    BugOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { useGameStore } from '../stores/gameStore';

const { Text } = Typography;

export default function GameHeader() {
    const { token } = theme.useToken();
    const player = useGameStore(state => state.player);
    const inventory = useGameStore(state => state.inventory);
    const kills = useGameStore(state => state.kills);

    const hpPercent = ((player?.hp || 0) / (player?.maxHp || 100)) * 100;
    const xpPercent = ((player?.pXP || 0) / (player?.pXPNext || 100)) * 100;

    return;
    return (
        <div style={{
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: `2px solid ${token.colorPrimary}`,
            padding: '8px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
            {/* Left side - Logo/Title */}
            <div>
                <Text strong style={{ color: token.colorPrimary, fontSize: 18 }}>
                    ⚔️ ARENA ⚔️
                </Text>
            </div>

            {/* Center - Player Stats */}
            <Space size={32}>
                {/* Level & XP */}
                <div style={{ minWidth: 180 }}>
                    <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space size={4}>
                            <TrophyOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
                            <Text style={{ color: token.colorText, fontSize: 12 }}>
                                Lvl {player?.pLevel || 1}
                            </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            {player?.pXP || 0}/{player?.pXPNext || 100} XP
                        </Text>
                    </Space>
                    <Progress
                        percent={xpPercent}
                        showInfo={false}
                        strokeColor="#44aaff"
                        trailColor="rgba(255,255,255,0.1)"
                        size="small"
                        style={{ marginTop: 2 }}
                    />
                </div>

                {/* Health */}
                <div style={{ minWidth: 200 }}>
                    <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space size={4}>
                            <HeartOutlined style={{ color: '#ff4444', fontSize: 14 }} />
                            <Text style={{ color: token.colorText, fontSize: 12 }}>Health</Text>
                        </Space>
                        <Text style={{ color: '#ff8888', fontSize: 12, fontWeight: 'bold' }}>
                            {Math.floor(player?.hp || 0)}/{player?.maxHp || 100}
                        </Text>
                    </Space>
                    <Progress
                        percent={hpPercent}
                        showInfo={false}
                        strokeColor="#ff4444"
                        trailColor="rgba(255,255,255,0.1)"
                        size="small"
                        style={{ marginTop: 2 }}
                    />
                </div>
            </Space>

            {/* Right side - Resources */}
            <Space size={24}>
                {/* Dash/Dodge indicator (optional) */}
                <Space size={4}>
                    <ThunderboltOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Space to Dash</Text>
                </Space>
            </Space>
        </div>
    );
}