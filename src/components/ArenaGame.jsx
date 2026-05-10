// ArenaGame.jsx
import {useMemo, useState} from 'react';
import { ConfigProvider, message } from 'antd';
import ArenaHUD from './ArenaHUD.jsx';
import Inventory from './Inventory.jsx';
import PauseScreen from './PauseScreen.jsx';
import { cartoonTheme } from '../styles/cartoonTheme';
import '../styles/global.css';
import DeathScreen from "./DeathScreen.jsx";
import AbilityBar from "./PlayerStatsBar.jsx";
import LevelUpEffect from "./LevelUpEffect.jsx";
import BottomRightMenu from "./BottomRightMenu.jsx";
import ItemBrowser from "./ItemBrowser.jsx";

export default function ArenaGame() {
    const [messageApi, contextHolder] = message.useMessage();

    const theme = useMemo(() => cartoonTheme, []);

    return (
        <ConfigProvider theme={theme}>
            {contextHolder}

            {/* Top right logo */}
            <div style={{position: "absolute", top: 0, left: 0, zIndex: 10}}>
                <img src="/templogo.png" alt="Logo" style={{width: 120}}/>
            </div>

            {/* Fullscreen Game */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <ArenaHUD />
            </div>

            {/*
            <Shop />
            */}

            <ItemBrowser />

            <BottomRightMenu />

            <DeathScreen />

            <AbilityBar />

            <LevelUpEffect />
        </ConfigProvider>
    );
}