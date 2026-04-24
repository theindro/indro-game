// hooks/useGame.js - Simplified
import { useEffect, useRef } from 'react';
import { createGame } from '../game/index.js';

export function useGame(containerRef) {
    const destroyRef = useRef(null);

    useEffect(() => {
        // Only pass the container, no HUD elements needed
        let cancelled = false;

        createGame(null, containerRef?.current).then(destroy => {
            if (!cancelled) {
                destroyRef.current = destroy;
            } else {
                destroy?.();
            }
        });

        return () => {
            cancelled = true;
            destroyRef.current?.();
            destroyRef.current = null;
        };
    }, [containerRef]);
}