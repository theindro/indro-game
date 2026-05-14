// GameCanvas.jsx
import { useRef } from 'react';
import { useGame } from '../hooks/useGame.js';
import { useGameStore } from '../stores/gameStore.js';

export default function GameCanvas() {
    const containerRef = useRef(null);
    const restartGeneration = useGameStore((s) => s.restartGeneration);

    useGame(containerRef, restartGeneration);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                background: '#000',
            }}
        />
    );
}