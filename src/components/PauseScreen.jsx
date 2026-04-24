// components/PauseScreen.jsx - Updated to use store
import { Modal, Button, Space, Switch, Slider, Divider, Typography } from 'antd';
import {
    PauseCircleOutlined,
    CaretRightOutlined,
    SoundOutlined,
    SoundFilled,
    HomeOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useGameStore } from '../stores/gameStore';

const { Title, Text } = Typography;

export default function PauseScreen() {
    const gameState = useGameStore(state => state.gameState);
    const togglePause = useGameStore(state => state.togglePause);
    const resetGame = useGameStore(state => state.resetGame);
    const player = useGameStore(state => state.player);
    const inventory = useGameStore(state => state.inventory);
    const kills = useGameStore(state => state.kills);
    const audio = useGameStore(state => state.audio);
    const setMuted = useGameStore(state => state.setMuted);
    const setMusicVolume = useGameStore(state => state.setMusicVolume);
    const setSfxVolume = useGameStore(state => state.setSfxVolume);

    const handleResume = () => {
        togglePause();
        document.body.style.cursor = 'none';
    };

    const handleRestart = () => {
        if (window.confirm('Restart game? All progress will be lost.')) {
            resetGame();
            togglePause();
            document.body.style.cursor = 'none';
            window.location.reload();
        }
    };

    const handleQuit = () => {
        if (window.confirm('Quit to menu?')) {
            window.location.href = '/';
        }
    };

    if (!gameState?.paused) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{
                width: 500,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
                border: '3px solid #ffaa44',
                borderRadius: '24px',
                padding: '32px',
                textAlign: 'center',
            }}>
                <PauseCircleOutlined style={{ fontSize: 64, color: '#ffaa44', marginBottom: 16 }} />
                <Title level={1} style={{ color: '#ffaa44', margin: 0 }}>PAUSED</Title>

                {/* Player Stats */}
                <div style={{
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '12px',
                    padding: '16px',
                    margin: '20px 0',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>❤️ Health:</Text>
                        <Text strong style={{ color: '#ff6688' }}>{player?.hp}/{player?.maxHp}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>⚔️ Level:</Text>
                        <Text strong style={{ color: '#ffaa44' }}>{player?.pLevel}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>💰 Gold:</Text>
                        <Text strong style={{ color: '#ffcc44' }}>{inventory?.gold || 0}</Text>
                    </div>
                </div>

                {/* Audio Settings */}
                <div style={{ marginBottom: 24, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <SoundOutlined style={{ color: '#ffaa44' }} />
                        <Text strong style={{ color: '#ffaa44' }}>Audio Settings</Text>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text>Master Sound</Text>
                            <Switch
                                checked={!audio?.isMuted}
                                onChange={(checked) => setMuted(!checked)}
                                checkedChildren="ON"
                                unCheckedChildren="OFF"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Music Volume</Text>
                        <Slider
                            value={audio?.musicVolume || 0.3}
                            onChange={setMusicVolume}
                            min={0}
                            max={1}
                            step={0.01}
                            disabled={audio?.isMuted}
                            trackStyle={{ backgroundColor: '#ffaa44' }}
                        />
                    </div>

                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>SFX Volume</Text>
                        <Slider
                            value={audio?.sfxVolume || 0.5}
                            onChange={setSfxVolume}
                            min={0}
                            max={1}
                            step={0.01}
                            disabled={audio?.isMuted}
                            trackStyle={{ backgroundColor: '#ffaa44' }}
                        />
                    </div>
                </div>

                <Divider style={{ borderColor: 'rgba(255,170,68,0.3)' }} />

                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<CaretRightOutlined />}
                        onClick={handleResume}
                        style={{
                            background: '#44aa44',
                            borderColor: '#44aa44',
                            fontWeight: 'bold',
                            height: 48,
                        }}
                    >
                        Resume Game
                    </Button>
                </Space>
            </div>
        </div>
    );
}