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
import {useGameStore} from '../../stores/gameStore.js';
import { getSkillPointsEarned, getTotalSkillPointsSpent } from '../../game/skills/skillEffects.js';
import Inventory from './Inventory.jsx';
import PauseScreen from "../screens/PauseScreen.jsx";
import Character from "./Character.jsx";
import CraftingPanel from "./Crafting.jsx";
import QuestTracker from './quests/QuestTracker.jsx';
import QuestPanel from './quests/QuestPanel.jsx';
import SkillTreePanel from './skills/SkillTreePanel.jsx';

const MENU_ITEMS = [
    {
        key: 'settings',
        icon: <SettingOutlined/>,
        label: 'Settings',
        hotkey: 'Esc',
    },
    {
        key: 'quests',
        icon: <ExclamationCircleOutlined/>,
        label: 'Quests',
        hotkey: 'P',
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
                    <span style={{fontWeight: 600, color: 'white', fontSize: 15}}>
                                {gold.toLocaleString()}
                            </span>
                </Tag>
            </Tooltip>

            <Tooltip title="Void essence">
                <Tag style={{display: 'flex', alignItems: 'center', gap: 6, background: "transparent"}}>
                    <img src="/void_essence.png" alt="Essence" width={18} height={18}/>
                    <span style={{fontWeight: 600, color: 'white', fontSize: 15}}>
                                {voidEssence.toLocaleString()}
                            </span>
                </Tag>
            </Tooltip>

        </Space>
    )
}

const BottomRightMenu = () => {
    const [openPanel, setOpenPanel] = useState(null);
    const enchantFocusSlotIndex = useGameStore((s) => s.ui?.enchantFocusSlotIndex);
    const playerLevel = useGameStore((s) => s.player?.pLevel ?? 1);
    const skillRanks = useGameStore((s) => s.skills?.ranks ?? {});
    const skillPointsAvailable =
        getSkillPointsEarned(playerLevel) - getTotalSkillPointsSpent(skillRanks);

    const isPaused = useGameStore.getState().gameState.paused;

    useEffect(() => {
        if (enchantFocusSlotIndex !== null && enchantFocusSlotIndex !== undefined) {
            setOpenPanel('crafting');
        }
    }, [enchantFocusSlotIndex]);

    const togglePanel = (key) => {
        if (key === 'settings') {
            openSettings();
        }

        setOpenPanel(openPanel === key ? null : key);
    };

    const openSettings = () => {
        if (useGameStore.getState().showStartScreen) return;
        useGameStore.getState().togglePause();
    };


    useEffect(() => {
        const handleKey = (e) => {
            if (useGameStore.getState().showStartScreen) {
                return;
            }
            if (e.key.toLowerCase() === 'i') setOpenPanel(openPanel === 'inventory' ? '' : 'inventory');
            if (e.key.toLowerCase() === 'c') setOpenPanel(openPanel === 'character' ? '' : 'character');
            if (e.key.toLowerCase() === 'k') setOpenPanel(openPanel === 'crafting' ? '' : 'crafting');
            if (e.key.toLowerCase() === 'p') setOpenPanel(openPanel === 'quests' ? '' : 'quests');
            if (e.key.toLowerCase() === 'o') setOpenPanel(openPanel === 'skills' ? '' : 'skills');
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

            <QuestTracker onOpenQuests={() => setOpenPanel(openPanel === 'quests' ? '' : 'quests')} />

            <div style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 9999,
            }}>
                <Row type="flex" justify="center" align="middle">


                    <Card
                        style={{
                            background: "transparent",
                            border: "none",
                        }}
                        styles={{body: {padding: 0}}}
                    >
                        <Space size={4}>

                            {MENU_ITEMS.map((item) => {
                                const button = (
                                    <Button
                                        disabled={item.disabled}
                                        icon={item.key === 'inventory' ?
                                            <img style={{marginBottom: -3}} src={item.icon} width={20}
                                                 alt=""/> : item.icon}
                                        onClick={() => togglePanel(item.key)}
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 10,
                                            fontSize: 22,
                                        }}
                                    />
                                );

                                const showSkillBadge =
                                    item.key === 'skills' && skillPointsAvailable > 0;

                                return (
                                    <Tooltip
                                        key={item.key}
                                        title={
                                            showSkillBadge
                                                ? `${item.label} (${item.hotkey}) — ${skillPointsAvailable} unspent point${skillPointsAvailable !== 1 ? 's' : ''}`
                                                : `${item.label} (${item.hotkey})`
                                        }
                                        placement="top"
                                        overlayStyle={{zIndex: 10001}}
                                    >
                                        {showSkillBadge ? (
                                            <Badge
                                                count={skillPointsAvailable}
                                                offset={[-6, 6]}
                                                style={{ zIndex: 1 }}
                                            >
                                                {button}
                                            </Badge>
                                        ) : (
                                            button
                                        )}
                                    </Tooltip>
                                );
                            })}

                        </Space>
                    </Card>

                    <Inventory isOpen={openPanel === 'inventory'} setOpen={setOpenPanel}/>

                    <Character isOpen={openPanel === 'character'} setOpen={setOpenPanel}/>

                    <CraftingPanel isOpen={openPanel === 'crafting'} onClose={() => setOpenPanel('')}/>

                    <QuestPanel isOpen={openPanel === 'quests'} />

                    <SkillTreePanel isOpen={openPanel === 'skills'} onClose={() => setOpenPanel('')} />

                    <PauseScreen/>

                </Row>
            </div>
        </div>
    );
}

export default BottomRightMenu;