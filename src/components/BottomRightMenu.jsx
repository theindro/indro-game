import React, {useEffect, useState} from 'react';
import {
    Card,
    Space,
    Tooltip,
    Badge,
    Button, Tag, Row,
} from 'antd';
import {
    UserOutlined,
    TrophyOutlined,
    SettingOutlined,
    CompassOutlined,
    BellOutlined,
    FolderOutlined,
    QuestionCircleOutlined,
    ExclamationCircleOutlined,
    PlusCircleOutlined, HeatMapOutlined, FireOutlined,
} from '@ant-design/icons';
import {useGameStore} from '../stores/gameStore';
import Inventory from './Inventory';
import PauseScreen from "./PauseScreen.jsx";
import Character from "./Character.jsx";
import CraftingPanel from "./Crafting.jsx";

const MENU_ITEMS = [
    {
        key: 'settings',
        icon: <SettingOutlined/>,
        label: 'Settings',
        hotkey: 'Esc',
    },
    {
        key: 'map',
        icon: <CompassOutlined/>,
        label: 'Map',
        hotkey: 'M',
        disabled: true,
    },
    {
        key: 'quests',
        icon: <ExclamationCircleOutlined/>,
        label: 'Quests',
        hotkey: 'p',
        disabled: true,
    },
    {
        key: 'crafting',
        icon: '⚒',
        label: 'Crafting',
        hotkey: 'K',
    },
    {
        key: 'skills',
        icon: <FireOutlined/>,
        label: 'Skills',
        hotkey: 'O',
        disabled: true,
    },
    {
        key: 'character',
        icon: '⚔',
        label: 'Character',
        hotkey: 'C',
    },
    {
        key: 'inventory',
        icon: '/icons/backpack.png',
        label: 'Inventory',
        hotkey: 'I',
    },
];

const CurrencyList = () => {
    const gold = useGameStore((s) => s.inventory?.gold ?? 0);
    const voidEssence = useGameStore((s) => s.inventory?.void_essence ?? 0);
    return (
        <Space direction="horizontal" size={6} style={{padding: '0 12px', top: 12, left: 0, zIndex: 9999, position: "fixed"}}>
            <Tooltip title="Gold">
                <Tag style={{display: 'flex', alignItems: 'center', gap: 6, background: "transparent"}}>
                    <img src="/rpg/coins.png" alt="Gold" width={18} height={18}/>
                    <span style={{fontWeight: 600, color: '#e8a825', fontSize: 15}}>
                                {gold.toLocaleString()}
                            </span>
                </Tag>
            </Tooltip>

            <Tooltip title="Void essence">
                <Tag style={{display: 'flex', alignItems: 'center', gap: 6, background: "transparent"}}>
                    <img src="/void_essence.png" alt="Essence" width={18} height={18}/>
                    <span style={{fontWeight: 600, color: 'black', fontSize: 15}}>
                                {voidEssence.toLocaleString()}
                            </span>
                </Tag>
            </Tooltip>

        </Space>
    )
}

const BottomRightMenu = () => {
    const [openPanel, setOpenPanel] = useState(null);

    const isPaused = useGameStore.getState().gameState.paused;

    const togglePanel = (key) => {
        if (key === 'settings') {
            openSettings();
        }

        setOpenPanel(openPanel === key ? null : key);
    };

    const openSettings = () => {
        useGameStore.getState().togglePause();
    }


    useEffect(() => {
        const handleKey = (e) => {
            if (e.key.toLowerCase() === 'i') setOpenPanel(openPanel === 'inventory' ? '' : 'inventory');
            if (e.key.toLowerCase() === 'c') setOpenPanel(openPanel === 'character' ? '' : 'character');
            if (e.key.toLowerCase() === 'k') setOpenPanel(openPanel === 'crafting' ? '' : 'crafting');
            if (!openPanel) {
                if (e.key === 'Escape') {
                    setOpenPanel(openPanel === 'settings' ? '' : 'settings')
                    useGameStore.getState().togglePause();
                }
            } else {
                if (e.key === 'Escape') {
                    setOpenPanel('');
                    if (openPanel === 'settings') {
                        useGameStore.getState().togglePause();

                    }
                }
            }
        };

        window.addEventListener('keydown', handleKey);

        return () => window.removeEventListener('keydown', handleKey);
    }, [openPanel]);

    return (
        <div>
            <CurrencyList/>

            <div style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 9999,
            }}>
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
                                        title={`${item.label} (${item.hotkey})`}
                                        placement="top"
                                        overlayStyle={{zIndex: 10001}}
                                    >
                                        <Button
                                            disabled={item.disabled}
                                            type={openPanel === item.key ? "primary" : "text"}
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

                    <Inventory isOpen={openPanel === 'inventory'} setOpen={setOpenPanel}/>

                    <Character isOpen={openPanel === 'character'} setOpen={setOpenPanel}/>

                    <CraftingPanel isOpen={openPanel === 'crafting'}/>

                    <PauseScreen/>

                </Row>
            </div>
        </div>
    );
}

export default BottomRightMenu;