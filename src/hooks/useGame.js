import { useEffect, useRef } from 'react';
import { createGame } from '../game/index.js';

export function useGame(containerRef) {
    const destroyRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function boot() {
            // Always cleanup previous instance first
            destroyRef.current?.();
            destroyRef.current = null;

            const destroy = await createGame(null, containerRef?.current);

            if (cancelled) {
                destroy?.();
                return;
            }

            destroyRef.current = destroy;
        }

        boot();

        // IMPORTANT: Vite HMR handling
        if (import.meta.hot) {
            import.meta.hot.dispose(() => {
                destroyRef.current?.();
                destroyRef.current = null;
            });

            import.meta.hot.accept(() => {
                // Force full restart of game instance
                boot();
            });
        }

        return () => {
            cancelled = true;
            destroyRef.current?.();
            destroyRef.current = null;
        };
    }, [containerRef]);
}