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
    Select,
    Collapse,
    Space,
    Switch,
} from "antd";

import {assetManager} from "../../game/utils/assetManager.js";

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

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "z") {
                setWorldEditor(!open)
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    // Build asset database from assetManager
    const assets = useMemo(() => {
        const arr = [];

        for (const [id, texture] of assetManager.textures.entries()) {

            // skip aliases
            if (!texture?.source?.resource?.url && !texture?.baseTexture) {
                continue;
            }

            let type = "unknown";

            // detect type from ID
            if (id.includes("tree")) type = "tree";
            else if (id.includes("bush")) type = "bush";
            else if (id.includes("stone")) type = "stone";
            else if (id.includes("snow")) type = "snow_stone";
            else if (id.includes("explosion") || id.includes("burst")) type = "vfx";
            else if (id.includes("ground")) type = "ground";
            else if (id.includes("boots")) type = "boots";
            else if (id.includes("gloves")) type = "gloves";
            else if (id.includes("helmet")) type = "helmet";
            else if (id.includes("chest")) type = "chest";
            else if (id.includes("bow")) type = "bow";
            else if (id.includes("ring")) type = "ring";
            else if (id.includes("amulet")) type = "amulet";

            arr.push({
                id,
                type,
                texture,
                width: texture.width,
                height: texture.height,
                source:
                    texture?.source?.label ||
                    texture?.baseTexture?.resource?.url ||
                    "unknown",
            });
        }

        return arr;
    }, []);

    const filteredAssets = useMemo(() => {
        return assets.filter((a) => {
            return (
                a.id.toLowerCase().includes(search.toLowerCase()) ||
                a.type.toLowerCase().includes(search.toLowerCase())
            );
        });
    }, [assets, search]);

    const groupedAssets = useMemo(() => {

        const groups = {};

        for (const asset of filteredAssets) {

            if (!groups[asset.type]) {
                groups[asset.type] = [];
            }

            groups[asset.type].push(asset);
        }

        return groups;

    }, [filteredAssets]);

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

                    <div style={{
                        display: "flex",
                        gap: 10,
                        marginBottom: 12,
                    }}>
                        <Input
                            placeholder="Search props, VFX, sprites..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div style={{
                        overflowY: "auto",
                        height: "72vh",
                        paddingRight: 8,
                    }}>

                        {Object.entries(groupedAssets).map(([type, list]) => (

                            <div key={type}>

                                <Divider orientation="left">
                                    <Space>
                                        <Tag color={typeColors[type]}>
                                            {type.toUpperCase()}
                                        </Tag>

                                        <Text type="secondary">
                                            {list.length}
                                        </Text>
                                    </Space>
                                </Divider>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                                        gap: 10,
                                        marginBottom: 18,
                                    }}
                                >

                                    {list.map((asset) => {

                                        const isSelected =
                                            selectedAsset?.id === asset.id;

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
                                                bodyStyle={{
                                                    padding: 8,
                                                }}
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
                                                        src={asset.source}
                                                        alt={asset.id}
                                                        style={{
                                                            maxWidth: "100%",
                                                            maxHeight: "100%",
                                                            imageRendering: "pixelated",
                                                        }}
                                                    />
                                                </div>

                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        display: "block",
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    {asset.id}
                                                </Text>

                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: 10,
                                                    }}
                                                >
                                                    {asset.width}x{asset.height}
                                                </Text>

                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
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