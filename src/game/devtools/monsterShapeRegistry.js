import {
    VOID_SHAPE,
    VOID_SHAPE_2,
    VOID_SHAPE_3,
    VOID_SHAPE_4,
    VOID_SHAPE_5,
    VOID_SHAPE_6,
    VOID_SHAPE_7,
    VOID_SHAPE_8,
    VOID_SHAPE_BAT,
} from '../monsters.js';
import { normalizeShapeDefinition } from './monsterEditorUtils.js';

/** @type {Record<string, object>} */
export const MONSTER_SHAPE_LIBRARY = {
    VOID_SHAPE: { label: 'Tank', def: VOID_SHAPE },
    VOID_SHAPE_2: { label: 'Rusher', def: VOID_SHAPE_2 },
    VOID_SHAPE_3: { label: 'Ranged', def: VOID_SHAPE_3 },
    VOID_SHAPE_4: { label: 'Exploder', def: VOID_SHAPE_4 },
    VOID_SHAPE_5: { label: 'Shape 5', def: VOID_SHAPE_5 },
    VOID_SHAPE_6: { label: 'Shape 6', def: VOID_SHAPE_6 },
    VOID_SHAPE_7: { label: 'Default mob', def: VOID_SHAPE_7 },
    VOID_SHAPE_8: { label: 'Shape 8', def: VOID_SHAPE_8 },
    VOID_SHAPE_BAT: { label: 'Bat', def: VOID_SHAPE_BAT },
};

export const MONSTER_SHAPE_KEYS = Object.keys(MONSTER_SHAPE_LIBRARY);

export function getShapeExportName(key) {
    return MONSTER_SHAPE_KEYS.includes(key) ? key : 'VOID_SHAPE';
}

export function loadShapeModel(key) {
    const entry = MONSTER_SHAPE_LIBRARY[key];
    return normalizeShapeDefinition(entry?.def);
}

export function listShapeOptions() {
    return MONSTER_SHAPE_KEYS.map((key) => ({
        key,
        label: `${key} (${MONSTER_SHAPE_LIBRARY[key].label})`,
    }));
}
