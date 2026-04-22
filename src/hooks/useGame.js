import { useEffect, useRef } from 'react';
import { createGame } from '../game/index.js';

/**
 * Initialises the PixiJS game and wires up the HUD element refs.
 * Returns nothing — the game mounts itself into document.body.
 */
export function useGame() {
    const destroyRef = useRef(null);

    useEffect(() => {
        // Gather HUD DOM elements by id (they are rendered by ArenaHUD)
        const hudElements = {
            hpFill:     document.getElementById('hp-fill'),
            hpLabel:    document.getElementById('hp-label'),
            xpFill:     document.getElementById('xp-fill'),
            levelBadge: document.getElementById('level-badge'),
            killsEl:    document.getElementById('kills-count'),
            biomeEl:    document.getElementById('biome-name'),
            bossPanelEl:document.getElementById('boss-panel'),
            bossNameEl: document.getElementById('boss-name'),
            bossFillEl: document.getElementById('boss-fill'),
        };

        let cancelled = false;

        createGame(hudElements).then(destroy => {
            if (cancelled) {
                destroy?.();
            } else {
                destroyRef.current = destroy;
            }
        });

        return () => {
            cancelled = true;
            destroyRef.current?.();
            destroyRef.current = null;
        };
    }, []);
}