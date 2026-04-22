import ArenaHUD from './ArenaHUD.jsx';
import { useGame } from '../hooks/useGame.js';

/**
 * Root component.  ArenaHUD mounts the DOM elements first,
 * then useGame() picks them up by id and starts Pixi.
 */
export default function ArenaGame() {
    useGame(); // initialises PixiJS after first render

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            <ArenaHUD />
        </div>
    );
}