// components/LevelUpEffect.jsx
import React, {useEffect, useState} from "react";
import {useGameStore} from "../../stores/gameStore.js";
import {audioManager} from "../../game/utils/audioManager.js";
import { MAX_PLAYER_LEVEL } from '../../game/skills/skillTreeDefinitions.js';

export default function LevelUpEffect() {
    const levelUpEffect = useGameStore((s) => s.levelUpEffect);
    const clearLevelUpEffect = useGameStore((s) => s.clearLevelUpEffect);
    const playerLevel = useGameStore((s) => s.player?.pLevel);
    const [visible, setVisible] = useState(false);
    const [displayLevel, setDisplayLevel] = useState(playerLevel);

    useEffect(() => {
        if (!levelUpEffect) return;

        setDisplayLevel(playerLevel);
        setVisible(true);
        clearLevelUpEffect();
        audioManager.playSFX('/sounds/level-up.mp3', 0.15);

        const t = setTimeout(() => setVisible(false), 5000);
        return () => clearTimeout(t);
    }, [levelUpEffect, playerLevel, clearLevelUpEffect]);

    if (!visible) return null;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "18vh",
            zIndex: 9998,
            pointerEvents: "none",
        }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                animation: "lvlup 5s ease forwards",
            }}>
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.5)",
                }}>
                    Level up
                </div>
                <div style={{
                    fontSize: 72,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: -2,
                    lineHeight: 1,
                }}>
                    {displayLevel}
                </div>
                {displayLevel <= MAX_PLAYER_LEVEL && (
                    <div style={{
                        fontSize: 22,
                        color: "#ffd299",
                        letterSpacing: -1,
                        lineHeight: 1.2,
                    }}>
                        +1 skill point — open Skills (O)
                    </div>
                )}
            </div>
            <style>{`
                @keyframes lvlup {
                    0%   { opacity: 0; transform: translateY(12px) scale(0.92); }
                    15%  { opacity: 1; transform: translateY(0px) scale(1); }
                    70%  { opacity: 1; transform: translateY(0px) scale(1); }
                    100% { opacity: 0; transform: translateY(-16px) scale(1.04); }
                }
            `}</style>
        </div>
    );
}
