// devtools/editorRegistry.js

import { ARCHETYPES } from "../../game/controllers/mobArchetypes/index.js";
import { INTERACTABLE_PROP_TYPES } from "../../game/world/interactablePropConfig.js";

export const EDITOR_MOBS = [
    {
        id: ARCHETYPES.RUSHER,
        label: 'Rusher',
        type: 'mob'
    },
    {
        id: ARCHETYPES.TANK,
        label: 'Tank',
        type: 'mob'
    },
    {
        id: ARCHETYPES.RANGED,
        label: 'Ranged',
        type: 'mob'
    },
    {
        id: ARCHETYPES.EXPLODER,
        label: 'Exploder',
        type: 'mob'
    },
];

export const EDITOR_INTERACTABLES =
    Object.values(INTERACTABLE_PROP_TYPES).map(p => ({
        id: p.id,
        label: p.label,
        type: 'interactable',
        def: p
    }));