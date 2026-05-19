// GameApp.jsx
import {useMemo, useState} from 'react';
import { ConfigProvider, message } from 'antd';
import GameCanvas from './GameCanvas.jsx';
import { cartoonTheme } from '../styles/cartoonTheme';
import '../styles/global.css';
import { useGameStore } from '../stores/gameStore.js';
import DeathScreen from "./screens/DeathScreen.jsx";
import StartGameScreen from "./screens/StartGameScreen.jsx";
import AbilityBar from "./game-ui/PlayerAbilityBar.jsx";
import LevelUpEffect from "./game-ui/LevelUpEffect.jsx";
import BossHealthBar from "./game-ui/BossHealthBar.jsx";
import BottomRightMenu from "./game-ui/BottomRightMenu.jsx";
import QuestToastListener from "./game-ui/quests/QuestToastListener.jsx";
import BottomDevMenu from "./devtools/BottomDevMenu.jsx";

export default function GameApp() {
    const [messageApi, contextHolder] = message.useMessage();
    const theme = useMemo(() => cartoonTheme, []);
    const showStartScreen = useGameStore((s) => s.showStartScreen);

    return (
        <ConfigProvider theme={theme}>
            {contextHolder}

            {/* Fullscreen Game */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <GameCanvas />
            </div>

            {import.meta.env.DEV && <BottomDevMenu />}

            {!showStartScreen && <BottomRightMenu />}

            {!showStartScreen && <QuestToastListener />}

            <DeathScreen />

            <StartGameScreen />

            {!showStartScreen && <AbilityBar />}

            <BossHealthBar />

            <LevelUpEffect />
        </ConfigProvider>
    );
}