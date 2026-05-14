// components/DeathScreen.jsx
import {useEffect, useState} from 'react';
import {Modal, Button, Statistic, Space, Typography, Divider} from 'antd';
import {
    ReloadOutlined,
    HomeOutlined,
    TrophyOutlined,
    GoldOutlined,
    ClockCircleOutlined,
    RiseOutlined,
} from '@ant-design/icons';
import {useGameStore} from '../../stores/gameStore.js';

const {Title, Text} = Typography;

export default function DeathScreen() {
    const [isOpen, setIsOpen] = useState(false);
    const isDead = useGameStore(state => state.gameState.dead);
    const inventory = useGameStore(state => state.inventory);
    const kills = useGameStore(state => state.kills);
    const restartGame = useGameStore(state => state.restartGame);

    // Track playtime (optional)
    const [playTime, setPlayTime] = useState(0);

    useEffect(() => {
        setIsOpen(isDead);
    }, [isDead]);

    if (!isDead) return;

    const handleQuit = () => {
        restartGame();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    console.log('rendering deathscreen');

    return (
        <Modal
            open={isOpen}
            closable={false}
            footer={null}
            centered
            width={550}
            modalRender={(node) => node}
        >
            <div style={{padding: '40px 32px', textAlign: 'center'}}>
                {/* Title */}
                <Title level={1} style={{
                    margin: 0,
                    fontSize: 48,
                    letterSpacing: 4,
                }}>
                    YOU DIED
                </Title>

                <Text type="secondary" style={{
                    fontSize: 14,
                    display: 'block',
                    marginTop: 8,
                }}>
                    The darkness claims another soul...
                </Text>

                <Divider/>

                {/* Stats */}
                <div style={{marginBottom: 32}}>
                    <Title level={4} style={{marginBottom: 20}}>
                        <TrophyOutlined/> Final Stats
                    </Title>

                    <Space direction="vertical" size={12} style={{width: '100%'}}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text><TrophyOutlined/> Level Reached</Text>
                            <Text strong>{1}</Text>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text> Enemies Slain</Text>
                            <Text strong>{kills || 0}</Text>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text><GoldOutlined/> Gold Collected</Text>
                            <Text strong>{inventory?.gold || 0}</Text>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                        }}>
                            <Text><ClockCircleOutlined/> Time Survived</Text>
                            <Text strong>{formatTime(playTime)}</Text>
                        </div>
                    </Space>
                </div>

                <Divider/>

                {/* Action Buttons */}
                <Space direction="vertical" size={12} style={{width: '100%'}}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<RiseOutlined/>}
                        onClick={handleQuit}

                    >Retry</Button>
                </Space>

                <Text type="secondary" style={{marginTop: 20, display: "block"}}>
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