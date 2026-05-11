// GameCanvas.jsx
import { useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame.js';

export default function GameCanvas() {
    const containerRef = useRef(null);

    useGame(containerRef); // Pass container ref to game

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