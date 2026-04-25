// ArenaGame.jsx
import { useState } from 'react';
import { ConfigProvider, message } from 'antd';
import ArenaHUD from './ArenaHUD.jsx';
import GameHeader from './GameHeader.jsx';
import Inventory from './Inventory.jsx';
import Shop from './Shop.jsx';
import Sidebar from './Sidebar.jsx';
import PauseScreen from './PauseScreen.jsx';
import { cartoonTheme } from '../styles/cartoonTheme';
import '../styles/global.css';
import DeathScreen from "./DeathScreen.jsx";

export default function ArenaGame() {
    const [collapsed, setCollapsed] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    return (
        <ConfigProvider theme={cartoonTheme}>
            {contextHolder}

            {/* Fullscreen Game */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <ArenaHUD />
            </div>

            {/* UI Overlays   */}

            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <GameHeader />
                </div>
            </div>

            {/* Sidebar
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto', height: '100%' }}>
                    <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
                </div>
            </div>
            */}

            <Inventory />
            <Shop />
            <PauseScreen />
            <DeathScreen />
        </ConfigProvider>
    );
}