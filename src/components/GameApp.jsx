// GameApp.jsx
import {useMemo, useState} from 'react';
import { ConfigProvider, message } from 'antd';
import GameCanvas from './GameCanvas.jsx';
import { cartoonTheme } from '../styles/cartoonTheme';
import '../styles/global.css';
import DeathScreen from "./screens/DeathScreen.jsx";
import AbilityBar from "./game-ui/PlayerAbilityBar.jsx";
import LevelUpEffect from "./game-ui/LevelUpEffect.jsx";
import BottomRightMenu from "./game-ui/BottomRightMenu.jsx";
import BottomDevMenu from "./devtools/BottomDevMenu.jsx";

export default function GameApp() {
    const [messageApi, contextHolder] = message.useMessage();
    const theme = useMemo(() => cartoonTheme, []);

    return (
        <ConfigProvider theme={theme}>
            {contextHolder}

            {/* Top right logo */}
            <div style={{position: "absolute", top: 30, left: 10, zIndex: 10}}>
                <img src="/templogo.png" alt="Logo" style={{width: 120}}/>
            </div>

            {/* Fullscreen Game */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <GameCanvas />
            </div>

            {import.meta.env.DEV && <BottomDevMenu />}

            <BottomRightMenu />

            <DeathScreen />

            <AbilityBar />

            <LevelUpEffect />
        </ConfigProvider>
    );
}