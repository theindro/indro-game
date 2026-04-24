// components/LoadingScreen.jsx
import { useEffect, useState } from 'react';
import { Modal, Progress, Typography, Space } from 'antd';
import { assetManager } from '../game/utils/assetManager.js';

const { Title, Text } = Typography;

export default function LoadingScreen({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAssets = async () => {
            await assetManager.loadAssets();

            setProgress(100);

            setTimeout(() => {
                setLoading(false);
                onComplete?.();
            }, 500);
        };

        loadAssets();
    }, []);

    return (
        <div style={{background: "black"}}>
            <Modal
                open={loading}
                closable={false}
                footer={null}
                centered
                width={400}
                styles={{
                    content: {
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
                        border: '3px solid #ffaa44',
                        borderRadius: 24,
                        textAlign: 'center',
                    }
                }}
            >
                <Space direction="vertical" size={24} style={{ width: '100%', padding: '20px' }}>
                    <Title level={2} style={{ color: '#ffaa44', margin: 0 }}>
                        Loading Assets...
                    </Title>
                    <Progress
                        percent={progress}
                        strokeColor="#ffaa44"
                        trailColor="rgba(255,255,255,0.1)"
                    />
                    <Text type="secondary">
                        Preparing your adventure...
                    </Text>
                </Space>
            </Modal>
        </div>
    );
}