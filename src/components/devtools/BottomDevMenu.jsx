import React, {useEffect, useState} from 'react';
import {
    Card,
    Space,
    Tooltip,
    Badge,
    Button, Tag, Row,
} from 'antd';
import {
    PauseCircleOutlined, SearchOutlined, EditOutlined, SaveOutlined, UploadOutlined, BugOutlined,
} from '@ant-design/icons';
import {useGameStore} from '../../stores/gameStore.js';
import WorldEditorModal from "./WorldEditorModal.jsx";
import {editorBridge} from "./editorBridge.js";
import ItemBrowser from "./ItemBrowser.jsx";
import MonsterEditorModal from "./MonsterEditorModal.jsx";

const MENU_ITEMS = [
    {
        key: 'world-edit-mode',
        icon: <PauseCircleOutlined/>,
        label: 'Pause/Unpause world',
        hotkey: '',
    },
    {
        key: 'world-editor-modal',
        icon: <EditOutlined/>,
        label: 'World editor modal',
        hotkey: '',
    },
    {
        key: 'item-browser',
        icon: <SearchOutlined/>,
        label: 'Item database',
        hotkey: '',
    },
    {
        key: 'monster-editor',
        icon: <BugOutlined/>,
        label: 'Monster shape editor',
        hotkey: '',
    },
    {
        key: 'save-world-edit-as-json',
        icon: <SaveOutlined/>,
        label: 'save-world-edit-as-json',
        hotkey: '',
    },
    {
        key: 'load-world-from-json',
        icon: <UploadOutlined/>,
        label: 'load-world-from-json',
        hotkey: '',
    },
];

const BottomDevMenu = () => {
    const [openPanel, setOpenPanel] = useState(null);
    const [isWorldPaused, setIsWorldPaused] = useState(null);

    const isPaused = useGameStore.getState().gameState.paused;

    const togglePanel = (key) => {
        if (key === 'world-edit-mode') {
            editorBridge.enableEditor(!isWorldPaused);

            setIsWorldPaused(!isWorldPaused)

            return;
        }

        if (key === 'save-world-edit-as-json') {
            editorBridge.saveWorldAsJson();
            return;
        }

        if (key === 'load-world-from-json') {
            loadWorldFromFile();
            return;
        }

        setOpenPanel(openPanel === key ? null : key);
    };

    const loadWorldFromFile = () => {
        const input = document.createElement("input");

        input.type = "file";
        input.accept = ".json";

        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                const json = JSON.parse(event.target.result);
                editorBridge.loadWorldFromJson(json);
            };

            reader.readAsText(file);
        };

        input.click();
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 9999,
        }}>
            <Tag color="red">DEVTOOLs</Tag>

            <Row type="flex" justify="center" align="middle">

                <Card
                    style={{
                        background: 'rgba(10, 12, 16, 0.85)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        padding: '8px 12px',
                    }}
                    styles={{body: {padding: 0}}}
                >
                    <Space size={4}>

                        {MENU_ITEMS.map((item) => {
                            return (
                                <Tooltip
                                    key={item.key}
                                    title={`${item.label}`}
                                    placement="top"
                                    overlayStyle={{zIndex: 10001}}
                                >
                                    <Button
                                        disabled={item.disabled}
                                        type={item.key === 'world-edit-mode' ? (isWorldPaused ? "primary" : "text") : (openPanel === item.key ? "primary" : "text")}
                                        icon={item.key === 'inventory' ?
                                            <img style={{marginBottom: -3}} src={item.icon} width={20}
                                                 alt=""/> : item.icon}
                                        onClick={() => togglePanel(item.key)}
                                        style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 10,
                                            fontSize: 22,
                                        }}
                                    />
                                </Tooltip>
                            )
                        })}
                    </Space>
                </Card>

                <WorldEditorModal
                    open={openPanel === 'world-editor-modal'}
                    setWorldEditor={setOpenPanel}
                    onPlaceAsset={(data) => {
                        console.log("PLACE ASSET", data);

                        // Place prop inside actual PIXI world
                        editorBridge.placeAsset(data);

                        setIsWorldPaused(true);

                        setOpenPanel(false);
                    }}
                />

                <ItemBrowser open={openPanel === 'item-browser'} setOpen={setOpenPanel}/>

                <MonsterEditorModal
                    open={openPanel === 'monster-editor'}
                    onClose={() => setOpenPanel(null)}
                />
            </Row>
        </div>
    );
}

export default BottomDevMenu;