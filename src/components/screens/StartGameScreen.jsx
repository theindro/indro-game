import { useEffect, useState } from 'react';
import { Modal, Button, Space, Switch, Slider, Typography } from 'antd';
import { CaretRightOutlined, RocketOutlined, SoundOutlined } from '@ant-design/icons';
import { useGameStore } from '../../stores/gameStore.js';

const { Text } = Typography;

export default function StartGameScreen() {
    const showStartScreen = useGameStore((s) => s.showStartScreen);
    const continueFromTitle = useGameStore((s) => s.continueFromTitle);
    const restartGame = useGameStore((s) => s.restartGame);
    const audio = useGameStore((s) => s.audio);
    const setMuted = useGameStore((s) => s.setMuted);
    const setMusicVolume = useGameStore((s) => s.setMusicVolume);
    const setSfxVolume = useGameStore((s) => s.setSfxVolume);

    const [hydrated, setHydrated] = useState(() => useGameStore.persist.hasHydrated());

    useEffect(() => {
        const unsub = useGameStore.persist.onFinishHydration(() => {
            setHydrated(true);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (showStartScreen) {
            document.body.style.cursor = 'default';
        }
    }, [showStartScreen]);

    if (!showStartScreen) return null;

    const handleContinue = () => {
        continueFromTitle();
        document.body.style.cursor = 'none';
    };

    const handleNewGame = () => {
        restartGame();
        document.body.style.cursor = 'none';
    };

    return (
        <Modal
            footer={false}
            open
            closable={false}
            maskClosable={false}
            zIndex={10100}
            centered
            styles={{ mask: { zIndex: 10099 } }}
            style={{ textAlign: 'center' }}
        >
            <img src="/templogo.png" alt="" style={{ width: '100%' }} />

            {false && (
                <div style={{marginBottom: 32, textAlign: 'left'}}>
                    <div style={{marginBottom: 12}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                            <Text>Master Sound</Text>
                            <Switch
                                checked={!audio?.isMuted}
                                onChange={(checked) => setMuted(!checked)}
                                checkedChildren="ON"
                                unCheckedChildren="OFF"
                            />
                        </div>
                    </div>

                    <div style={{marginBottom: 12}}>
                        <Text type="secondary" style={{fontSize: 12}}>
                            Music Volume
                        </Text>
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
                        <Text type="secondary" style={{fontSize: 12}}>
                            SFX Volume
                        </Text>
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
            )}

            {!hydrated && (
                <Text type="secondary" style={{display: 'block', marginBottom: 16}}>
                    Loading saved progress…
                </Text>
            )}

            <div style={{textAlign: 'center'}}>
                <Space justify="center" align="center" size={12} style={{width: '100%', justifyContent: 'center'}}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<CaretRightOutlined/>}
                        disabled={!hydrated}
                        onClick={handleContinue}
                    >
                        Start game
                    </Button>
                </Space>
            </div>

            <Text type="secondary" style={{display: 'block', marginTop: 20, fontSize: 12}}>
                Progress is saved automatically
            </Text>
        </Modal>
    );
}
