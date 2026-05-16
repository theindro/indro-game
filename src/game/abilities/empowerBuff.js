import { ARROW_TYPES } from '../controllers/createProjectileController.js';
import { useGameStore } from '../../stores/gameStore.js';

export function isEmpowerActive() {
    return performance.now() < (useGameStore.getState().empowerBuff?.endsAt ?? 0);
}

/** Player basic attack / barrage / rapid fire arrow type while Empower is active. */
export function getEmpoweredArrowType() {
    return isEmpowerActive() ? ARROW_TYPES.BURN : ARROW_TYPES.NORMAL;
}
