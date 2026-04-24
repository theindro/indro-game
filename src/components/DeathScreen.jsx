// components/DeathScreen.jsx
import { useEffect, useState } from 'react';
import { Modal, Button, Statistic, Space, Typography, Divider } from 'antd';
import {
    ReloadOutlined,
    HomeOutlined,
    TrophyOutlined,
    GoldOutlined,
    ClockCircleOutlined,
    RiseOutlined,
} from '@ant-design/icons';
import { useGameStore } from '../stores/gameStore';

const { Title, Text } = Typography;

export default function DeathScreen() {
    const [isOpen, setIsOpen] = useState(false);
    const gameState = useGameStore(state => state.gameState);
    const player = useGameStore(state => state.player);
    const inventory = useGameStore(state => state.inventory);
    const kills = useGameStore(state => state.kills);
    const resetGame = useGameStore(state => state.resetGame);
    const setDead = useGameStore(state => state.setDead);

    // Track playtime (optional)
    const [playTime, setPlayTime] = useState(0);

    useEffect(() => {
        // Start timer when game starts
        const startTime = Date.now();
        const timer = setInterval(() => {
            if (!gameState?.dead) {
                setPlayTime(Math.floor((Date.now() - startTime) / 1000));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setIsOpen(gameState?.dead || false);
    }, [gameState?.dead]);

    const handleQuit = () => {
        window.location.href = '/';
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <Modal
            open={isOpen}
            closable={false}
            footer={null}
            centered
            width={550}
            modalRender={(node) => node}
            styles={{
                content: {
                    background: 'linear-gradient(135deg, #1a0a0a 0%, #0f0a0a 100%)',
                    border: '3px solid #ff4444',
                    borderRadius: '24px',
                    padding: 0,
                    overflow: 'hidden',
                },
            }}
        >

            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                {/* Title */}
                <Title level={1} style={{
                    color: '#ff4444',
                    margin: 0,
                    textShadow: '3px 3px 0 #660000',
                    fontSize: 48,
                    letterSpacing: 4,
                }}>
                    YOU DIED
                </Title>

                <Text type="secondary" style={{
                    color: '#aa6666',
                    fontSize: 14,
                    display: 'block',
                    marginTop: 8,
                }}>
                    The darkness claims another soul...
                </Text>

                <Divider style={{ borderColor: 'rgba(255,68,68,0.3)', margin: '24px 0' }} />

                {/* Stats */}
                <div style={{ marginBottom: 32 }}>
                    <Title level={4} style={{ color: '#ffaa44', marginBottom: 20 }}>
                        <TrophyOutlined /> Final Stats
                    </Title>

                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text style={{ color: '#ffaa44' }}><TrophyOutlined /> Level Reached</Text>
                            <Text strong style={{ color: '#ffffff' }}>{player?.pLevel || 1}</Text>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text style={{ color: '#ffaa44' }}> Enemies Slain</Text>
                            <Text strong style={{ color: '#ff8866' }}>{kills || 0}</Text>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text style={{ color: '#ffaa44' }}><GoldOutlined /> Gold Collected</Text>
                            <Text strong style={{ color: '#ffcc44' }}>{inventory?.gold || 0}</Text>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text style={{ color: '#ffaa44' }}><ClockCircleOutlined /> Time Survived</Text>
                            <Text strong style={{ color: '#88aaff' }}>{formatTime(playTime)}</Text>
                        </div>
                    </Space>
                </div>

                <Divider style={{ borderColor: 'rgba(255,68,68,0.3)', margin: '24px 0' }} />

                {/* Action Buttons */}
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<RiseOutlined />}
                        onClick={handleQuit}
                        style={{
                            background: 'linear-gradient(135deg, #ff4444, #cc0000)',
                            border: 'none',
                            fontWeight: 'bold',
                            height: 48,
                            fontSize: 16,
                            boxShadow: '0 4px 0 #660000',
                        }}
                    >Retry</Button>
                </Space>

                <Text type="secondary" style={{
                    fontSize: 11,
                    marginTop: 24,
                    display: 'block',
                    color: '#664444',
                }}>
                    Your soul will be remembered...
                </Text>
            </div>

            {/* Add animation styles */}
            <style>{`
                @keyframes bloodDrip {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                }
            `}</style>
        </Modal>
    );
}