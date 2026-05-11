// GameApp.jsx
import {useMemo, useState} from 'react';
import { ConfigProvider, message } from 'antd';
import GameCanvas from './GameCanvas.jsx';
import Inventory from './game-ui/Inventory.jsx';
import PauseScreen from './screens/PauseScreen.jsx';
import { cartoonTheme } from '../styles/cartoonTheme';
import '../styles/global.css';
import DeathScreen from "./screens/DeathScreen.jsx";
import AbilityBar from "./game-ui/PlayerAbilityBar.jsx";
import LevelUpEffect from "./game-ui/LevelUpEffect.jsx";
import BottomRightMenu from "./game-ui/BottomRightMenu.jsx";
import ItemBrowser from "./devtools/ItemBrowser.jsx";
import WorldEditorModal from "./devtools/WorldEditorModal.jsx";
import { editorBridge } from "./devtools/editorBridge";

export default function GameApp() {
    const [messageApi, contextHolder] = message.useMessage();
    const [worldEditor, setWorldEditor] = useState(false);

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

            {/*
            <Shop />
            */}

            <WorldEditorModal
                open={worldEditor}
                setWorldEditor={setWorldEditor}
                onPlaceAsset={(data) => {
                    console.log("PLACE ASSET", data);

                    // Place prop inside actual PIXI world
                    editorBridge.placeAsset(data);

                    setWorldEditor(false);
                }}
            />

            <ItemBrowser />

            <BottomRightMenu />

            <DeathScreen />

            <AbilityBar />

            <LevelUpEffect />
        </ConfigProvider>
    );
}