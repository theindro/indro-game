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
        <div>
            <Modal
                open={loading}
                closable={false}
                footer={null}
                centered
                width={400}
            >
                <div style={{textAlign: 'center', padding: 20}}>
                    <Space direction="vertical" size={24}>
                        <Title level={2}>
                            Loading Assets...
                        </Title>
                        <Progress
                            percent={progress}
                            trailColor="rgba(255,255,255,0.1)"
                        />
                        <Text type="secondary">
                            Preparing your adventure...
                        </Text>
                    </Space>

                </div>
            </Modal>
        </div>
    );
}