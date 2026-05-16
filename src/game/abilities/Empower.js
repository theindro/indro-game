import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';

export function useEmpower() {
    const store = useGameStore.getState();
    const ability = store.abilities.ability3;
    const now = performance.now();
    const { x: px, y: py } = store.player.location;

    if (now < ability.cooldownEnd) {
        return false;
    }

    if (!store.useAbility(3, now)) {
        return false;
    }

    const durationSec = ability.buffDuration ?? 6;
    store.activateEmpower(durationSec);

    VFX.burst(px, py, 0xff5500, 14, 2.5);
    VFX.addFloat('Empower!', px, py - 28, '#ff8844');

    return true;
}
