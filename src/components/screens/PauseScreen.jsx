// components/PauseScreen.jsx - Updated to use store
import { Modal, Button, Space, Switch, Slider, Divider, Typography } from 'antd';
import { CaretRightOutlined, ReloadOutlined } from '@ant-design/icons';
import { useGameStore } from '../../stores/gameStore.js';

const { Text } = Typography;

export default function PauseScreen() {
    const gameState = useGameStore(state => state.gameState);
    const togglePause = useGameStore(state => state.togglePause);
    const audio = useGameStore(state => state.audio);
    const setMuted = useGameStore(state => state.setMuted);
    const setMusicVolume = useGameStore(state => state.setMusicVolume);
    const setSfxVolume = useGameStore(state => state.setSfxVolume);
    const restartGame = useGameStore(state => state.restartGame);

    const handleResume = () => {
        togglePause();
        document.body.style.cursor = 'none';
    };

    const handleRestart = () => {
        restartGame();
    };

    if (!gameState?.paused) return null;

    return (
        <Modal
            footer={false}
            open={gameState.paused}
            onCancel={handleResume}
            zIndex={10080}
            style={{ textAlign: 'center' }}
        >
            <img src="/templogo.png" alt="" style={{width:'100%'}} />

                {/* Audio Settings */}
                <div style={{ marginBottom: 40, textAlign: 'left' }}>
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
                        />
                    </div>
                </div>


                <div style={{textAlign: "center"}}>
                    <Space justify="center" align="center" size={12} style={{ width: '100%', justifyContent: 'center' }}>
                        <Button
                            type="default"
                            size="large"
                            icon={<ReloadOutlined />}
                            onClick={handleRestart}

                        >
                            Reset game
                        </Button>

                        <Button
                            type="primary"
                            size="large"
                            icon={<CaretRightOutlined />}
                            onClick={handleResume}

                        >
                            Resume Game
                        </Button>
                    </Space>
                </div>
        </Modal>
    );
}