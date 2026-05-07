// components/LevelUpEffect.jsx
import React, { useEffect, useState } from "react";
import { useGameStore } from "../stores/gameStore";

export default function LevelUpEffect() {
    const playerLevel = useGameStore((s) => s.player?.pLevel);
    const [visible, setVisible] = useState(false);
    const [displayLevel, setDisplayLevel] = useState(playerLevel);
    const [initialized, setInitialized] = useState(false);

    console.log('level up render');

    useEffect(() => {
        if (!initialized) {
            setInitialized(true);
            return;
        }
        setDisplayLevel(playerLevel);
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 2500);
        return () => clearTimeout(t);
    }, [playerLevel]);

    if (!visible) return null;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "flex-start",  // was "center"
            justifyContent: "center",
            paddingTop: "18vh",         // push down from top edge
            zIndex: 9998,
            pointerEvents: "none",
        }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                animation: "lvlup 2.5s ease forwards",
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