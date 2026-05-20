import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    Select,
    Button,
    Space,
    Typography,
    InputNumber,
    Divider,
    Input,
    message,
    Row,
    Col,
} from 'antd';
import { MonsterEditorEngine } from '../../game/devtools/MonsterEditorEngine.js';
import { listShapeOptions } from '../../game/devtools/monsterShapeRegistry.js';
import { formatShapeExportBlock, shapeModelToExport } from '../../game/devtools/monsterEditorUtils.js';

const { Text } = Typography;

async function saveShapeToMonstersFile(exportName, shape) {
    const res = await fetch('/__dev/monsters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportName, shape }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
    }
    return res.json();
}

function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function MonsterEditorModal({ open, onClose }) {
    const canvasHostRef = useRef(null);
    const engineRef = useRef(null);
    const [messageApi, contextHolder] = message.useMessage();

    const [shapeKey, setShapeKey] = useState('VOID_SHAPE_7');
    const [activePart, setActivePart] = useState('body');
    const [segmentCount, setSegmentCount] = useState(3);
    const [partList, setPartList] = useState([]);
    const [newPartType, setNewPartType] = useState('bezier');
    const [eyeX, setEyeX] = useState(10);
    const [eyeY, setEyeY] = useState(-4);
    const [eyeSize, setEyeSize] = useState(1);

    const syncUiFromEngine = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        setPartList(engine.getPartList());
        setActivePart(engine.getActivePart());
        setSegmentCount(engine.getActiveSegmentCount());
        const pos = engine.getEyePosition();
        setEyeX(pos.x);
        setEyeY(pos.y);
        setEyeSize(engine.getEyeSize());
    }, []);

    useEffect(() => {
        if (!open) {
            engineRef.current?.destroy();
            engineRef.current = null;
            return;
        }

        let cancelled = false;

        (async () => {
            await new Promise((r) => requestAnimationFrame(r));
            if (cancelled || !canvasHostRef.current) return;

            const engine = new MonsterEditorEngine(canvasHostRef.current);
            engine.onModelChange = syncUiFromEngine;
            engineRef.current = engine;
            await engine.init();
            engine.setShapeKey(shapeKey);
            syncUiFromEngine();
        })();

        return () => {
            cancelled = true;
            engineRef.current?.destroy();
            engineRef.current = null;
        };
    }, [open]);

    const handleShapeKeyChange = (key) => {
        setShapeKey(key);
        engineRef.current?.setShapeKey(key);
        syncUiFromEngine();
    };

    const handlePartChange = (partId) => {
        engineRef.current?.setActivePart(partId);
        syncUiFromEngine();
    };

    const handleSegmentChange = (val) => {
        const n = val ?? 3;
        setSegmentCount(n);
        engineRef.current?.setActiveSegmentCount(n);
        syncUiFromEngine();
    };

    const handleAddPart = () => {
        engineRef.current?.addPart(newPartType);
        syncUiFromEngine();
    };

    const handleRemovePart = () => {
        if (activePart === 'body' || activePart === 'eye') return;
        engineRef.current?.removePart(activePart);
        syncUiFromEngine();
    };

    const getExportPayload = () => {
        const engine = engineRef.current;
        if (!engine) return null;
        const model = engine.getModel();
        return { exportName: shapeKey, shape: shapeModelToExport(model) };
    };

    const handleSave = async () => {
        const payload = getExportPayload();
        if (!payload) return;

        if (!import.meta.env.DEV) {
            messageApi.warning('File save only works in dev server. Use Copy export instead.');
            return;
        }

        try {
            await saveShapeToMonstersFile(payload.exportName, payload.shape);
            messageApi.success(`Saved ${payload.exportName} to src/game/monsters.js`);
        } catch (e) {
            messageApi.error(e.message);
        }
    };

    const handleCopyExport = () => {
        const payload = getExportPayload();
        if (!payload) return;
        const block = formatShapeExportBlock(payload.exportName, payload.shape);
        navigator.clipboard.writeText(block).then(() => {
            messageApi.success('Export block copied to clipboard');
        });
    };

    const handleDownloadSnippet = () => {
        const payload = getExportPayload();
        if (!payload) return;
        const block = formatShapeExportBlock(payload.exportName, payload.shape);
        downloadText(`${payload.exportName}.js.txt`, block);
    };

    const activeIsBezier =
        activePart === 'body' ||
        partList.find((p) => p.id === activePart)?.type === 'bezier';

    const shapeOptions = listShapeOptions();

    return (
        <>
            {contextHolder}
            <Modal
                title="Monster shape editor"
                open={open}
                onCancel={onClose}
                width={1100}
                footer={null}
                destroyOnClose
                styles={{ body: { paddingTop: 12 } }}
            >
                <Row gutter={16}>
                    <Col span={15}>
                        <div
                            ref={canvasHostRef}
                            style={{
                                width: '100%',
                                height: 520,
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: '#0b0b14',
                            }}
                        />
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                            Preview matches in-game layout (body centered on crosshair). Coordinates in monsters.js are design-space; eye and parts use the same anchor + scale as mobs.
                        </Text>
                    </Col>

                    <Col span={9}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Load from monsters.js</Text>
                        <Select
                            style={{ width: '100%', marginTop: 4 }}
                            value={shapeKey}
                            options={shapeOptions.map((o) => ({ value: o.key, label: o.label }))}
                            onChange={handleShapeKeyChange}
                        />

                        <Divider style={{ margin: '12px 0' }} />

                        <Text type="secondary" style={{ fontSize: 11 }}>Edit part</Text>
                        <Select
                            style={{ width: '100%', marginTop: 4 }}
                            value={activePart}
                            options={partList.map((p) => ({ value: p.id, label: `${p.label} (${p.type})` }))}
                            onChange={handlePartChange}
                        />

                        {activeIsBezier && (
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Bezier segments</Text>
                                <InputNumber
                                    min={1}
                                    max={12}
                                    value={segmentCount}
                                    onChange={handleSegmentChange}
                                    style={{ width: '100%', marginTop: 4 }}
                                />
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    Point count: {1 + segmentCount * 3}
                                </Text>
                            </div>
                        )}

                        {activePart === 'eye' && (
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Eye position (design space)</Text>
                                <Space style={{ width: '100%', marginTop: 4 }} size={8}>
                                    <InputNumber
                                        addonBefore="X"
                                        value={eyeX}
                                        step={1}
                                        onChange={(v) => {
                                            const x = v ?? 0;
                                            setEyeX(x);
                                            engineRef.current?.setEyePosition(x, eyeY);
                                            syncUiFromEngine();
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                    <InputNumber
                                        addonBefore="Y"
                                        value={eyeY}
                                        step={1}
                                        onChange={(v) => {
                                            const y = v ?? 0;
                                            setEyeY(y);
                                            engineRef.current?.setEyePosition(eyeX, y);
                                            syncUiFromEngine();
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                </Space>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 10 }}>
                                    Eye size
                                </Text>
                                <InputNumber
                                    min={0.25}
                                    max={4}
                                    step={0.05}
                                    value={eyeSize}
                                    onChange={(v) => {
                                        const s = v ?? 1;
                                        setEyeSize(s);
                                        engineRef.current?.setEyeSize(s);
                                        syncUiFromEngine();
                                    }}
                                    style={{ width: '100%', marginTop: 4 }}
                                />
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    Drag yellow handle to move; cyan handle to resize.
                                </Text>
                            </div>
                        )}

                        <Divider style={{ margin: '12px 0' }} />

                        <Text type="secondary" style={{ fontSize: 11 }}>Add body part</Text>
                        <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                            <Select
                                value={newPartType}
                                onChange={setNewPartType}
                                style={{ width: '55%' }}
                                options={[
                                    { value: 'bezier', label: 'Bezier shape' },
                                    { value: 'circle', label: 'Circle' },
                                ]}
                            />
                            <Button type="primary" onClick={handleAddPart} style={{ width: '45%' }}>
                                Add
                            </Button>
                        </Space.Compact>

                        {activePart !== 'body' && activePart !== 'eye' && (
                            <Button danger size="small" onClick={handleRemovePart} style={{ marginTop: 8 }}>
                                Remove selected part
                            </Button>
                        )}

                        <Divider style={{ margin: '12px 0' }} />

                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                            <Button type="primary" block onClick={handleSave}>
                                Save to monsters.js
                            </Button>
                            <Button block onClick={handleCopyExport}>
                                Copy export block
                            </Button>
                            <Button block onClick={handleDownloadSnippet}>
                                Download snippet
                            </Button>
                        </Space>

                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 10 }}>
                            Save writes <code>src/game/monsters.js</code> in dev (npm run dev). New parts are stored in a{' '}
                            <code>parts</code> array on the shape export.
                        </Text>
                    </Col>
                </Row>
            </Modal>
        </>
    );
}
