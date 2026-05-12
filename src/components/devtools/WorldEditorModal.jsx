// components/WorldEditorModal.jsx
import React, {useEffect, useMemo, useState} from "react";
import {
    Modal,
    Input,
    Divider,
    Card,
    Tag,
    Row,
    Col,
    Typography,
    Button,
    InputNumber,
    Tabs,
    Collapse,
    Space,
    Switch,
} from "antd";

import {assetManager} from "../../game/utils/assetManager.js";
import {EDITOR_INTERACTABLES, EDITOR_MOBS} from "./editorRegistry.js";

const {Text} = Typography;

const typeColors = {
    tree: "green",
    bush: "lime",
    stone: "volcano",
    snow_stone: "cyan",
    vfx: "purple",
    ground: "gold",
    boots: "blue",
    gloves: "magenta",
    chest: "orange",
    helmet: "red",
    bow: "geekblue",
    ring: "gold",
    amulet: "purple",
};

const WorldEditorModal = ({
                              open,
                              setWorldEditor,
                              onPlaceAsset,
                          }) => {

    const [search, setSearch] = useState("");
    const [selectedAsset, setSelectedAsset] = useState(null);

    // editable settings
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [zIndex, setZIndex] = useState(0);
    const [alpha, setAlpha] = useState(1);
    const [animated, setAnimated] = useState(false);
    const [collidable, setCollidable] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [spawnChance, setSpawnChance] = useState(1);

    const editorData = [
        {
            category: 'Props',
            assets: assetManager.getEditorAssets()
        },

        {
            category: 'Mobs',
            assets: EDITOR_MOBS
        },

        {
            category: 'Interactables',
            assets: EDITOR_INTERACTABLES
        }
    ]

    const handlePlace = () => {

        if (!selectedAsset) return;


        onPlaceAsset?.({
            assetId: selectedAsset.id,
            type: selectedAsset.type,
            animated: selectedAsset.type === 'vfx',
            settings: {
                scale,
                rotation,
                zIndex,
                alpha,
                animated,
                collidable,
                snapToGrid,
                spawnChance,
            }
        });
    };

    return (
        <Modal
            title="World Editor"
            open={open}
            onCancel={() => setWorldEditor(false)}
            footer={null}
            width={1400}
            styles={{
                body: {
                    height: "80vh",
                    overflow: "hidden",
                }
            }}
        >

            <Row gutter={16} style={{height: "100%"}}>

                {/* LEFT SIDE */}
                <Col span={16}>
                    <Tabs
                        defaultActiveKey="props"
                        items={editorData.map((group) => ({
                            key: group.category.toLowerCase(),
                            label: group.category,
                            children: (
                                <div style={{ overflowY: "auto", height: "72vh", paddingRight: 8 }}>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                                            gap: 10,
                                        }}
                                    >
                                        {group.assets
                                            .filter((a) =>
                                                a.id.toLowerCase().includes(search.toLowerCase()) ||
                                                a.type?.toLowerCase?.().includes(search.toLowerCase())
                                            )
                                            .map((asset) => {
                                                const isSelected = selectedAsset?.id === asset.id;

                                                return (
                                                    <Card
                                                        key={asset.id}
                                                        hoverable
                                                        size="small"
                                                        onClick={() => setSelectedAsset(asset)}
                                                        style={{
                                                            cursor: "pointer",
                                                            border: isSelected
                                                                ? "2px solid #1677ff"
                                                                : "1px solid #303030",
                                                            background: "#111",
                                                        }}
                                                        bodyStyle={{ padding: 8 }}
                                                    >
                                                        <div
                                                            style={{
                                                                height: 70,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                marginBottom: 6,
                                                            }}
                                                        >
                                                            <img
                                                                src={asset?.meta?.file}
                                                                alt={asset.id}
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: "100%",
                                                                    imageRendering: "pixelated",
                                                                }}
                                                            />
                                                        </div>

                                                        <Text style={{ fontSize: 11 }}>{asset.id}</Text>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            {asset.width}x{asset.height}
                                                        </Text>
                                                    </Card>
                                                );
                                            })}
                                    </div>
                                </div>
                            ),
                        }))}
                    />
                </Col>

                {/* RIGHT SIDE */}
                <Col span={8}>

                    <div
                        style={{
                            background: "#111",
                            border: "1px solid #303030",
                            borderRadius: 8,
                            padding: 16,
                            height: "72vh",
                            overflowY: "auto",
                        }}
                    >

                        {!selectedAsset && (
                            <Text type="secondary">
                                Select asset from left
                            </Text>
                        )}

                        {selectedAsset && (
                            <>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        height: 220,
                                        marginBottom: 16,
                                        background: "#0d0d0d",
                                        borderRadius: 8,
                                    }}
                                >
                                    <img
                                        src={selectedAsset.source}
                                        alt={selectedAsset.id}
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: "100%",
                                            imageRendering: "pixelated",
                                            transform: `rotate(${rotation}deg) scale(${scale})`,
                                            opacity: alpha,
                                        }}
                                    />
                                </div>

                                <Space direction="vertical" style={{width: "100%"}}>

                                    <div>
                                        <Text strong>ID</Text>
                                        <div>{selectedAsset.id}</div>
                                    </div>

                                    <div>
                                        <Text strong>Type</Text>
                                        <div>
                                            <Tag color={typeColors[selectedAsset.type]}>
                                                {selectedAsset.type}
                                            </Tag>
                                        </div>
                                    </div>

                                    <div>
                                        <Text strong>Size</Text>
                                        <div>
                                            {selectedAsset.width} x {selectedAsset.height}
                                        </div>
                                    </div>

                                    <Divider />

                                    <Collapse
                                        defaultActiveKey={["transform"]}
                                        items={[
                                            {
                                                key: "transform",
                                                label: "Transform",
                                                children: (
                                                    <Space
                                                        direction="vertical"
                                                        style={{width: "100%"}}
                                                    >

                                                        <div>
                                                            <Text>Scale</Text>
                                                            <InputNumber
                                                                min={0.1}
                                                                max={10}
                                                                step={0.1}
                                                                value={scale}
                                                                onChange={(v) => setScale(v || 1)}
                                                                style={{width: "100%"}}
                                                            />
                                                        </div>

                                                        <div>
                                                            <Text>Rotation</Text>
                                                            <InputNumber
                                                                min={0}
                                                                max={360}
                                                                value={rotation}
                                                                onChange={(v) => setRotation(v || 0)}
                                                                style={{width: "100%"}}
                                                            />
                                                        </div>

                                                        <div>
                                                            <Text>Z Index</Text>
                                                            <InputNumber
                                                                value={zIndex}
                                                                onChange={(v) => setZIndex(v || 0)}
                                                                style={{width: "100%"}}
                                                            />
                                                        </div>

                                                        <div>
                                                            <Text>Alpha</Text>
                                                            <InputNumber
                                                                min={0}
                                                                max={1}
                                                                step={0.1}
                                                                value={alpha}
                                                                onChange={(v) => setAlpha(v || 1)}
                                                                style={{width: "100%"}}
                                                            />
                                                        </div>

                                                    </Space>
                                                )
                                            },

                                            {
                                                key: "flags",
                                                label: "Flags",
                                                children: (
                                                    <Space
                                                        direction="vertical"
                                                        style={{width: "100%"}}
                                                    >

                                                        <div style={{
                                                            display: "flex",
                                                            justifyContent: "space-between"
                                                        }}>
                                                            <Text>Animated</Text>
                                                            <Switch
                                                                checked={animated}
                                                                onChange={setAnimated}
                                                            />
                                                        </div>

                                                        <div style={{
                                                            display: "flex",
                                                            justifyContent: "space-between"
                                                        }}>
                                                            <Text>Collidable</Text>
                                                            <Switch
                                                                checked={collidable}
                                                                onChange={setCollidable}
                                                            />
                                                        </div>

                                                        <div style={{
                                                            display: "flex",
                                                            justifyContent: "space-between"
                                                        }}>
                                                            <Text>Snap To Grid</Text>
                                                            <Switch
                                                                checked={snapToGrid}
                                                                onChange={setSnapToGrid}
                                                            />
                                                        </div>

                                                    </Space>
                                                )
                                            },

                                            {
                                                key: "spawn",
                                                label: "Spawn Rules",
                                                children: (
                                                    <Space
                                                        direction="vertical"
                                                        style={{width: "100%"}}
                                                    >
                                                        <div>
                                                            <Text>Spawn Chance</Text>

                                                            <InputNumber
                                                                min={0}
                                                                max={1}
                                                                step={0.01}
                                                                value={spawnChance}
                                                                onChange={(v) => setSpawnChance(v || 1)}
                                                                style={{width: "100%"}}
                                                            />
                                                        </div>
                                                    </Space>
                                                )
                                            }
                                        ]}
                                    />

                                    <Divider />

                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        onClick={handlePlace}
                                    >
                                        Place Into World
                                    </Button>

                                </Space>
                            </>
                        )}

                    </div>
                </Col>

            </Row>

        </Modal>
    );
};

export default WorldEditorModal;