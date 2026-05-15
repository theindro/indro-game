// devtools/editorRegistry.js

import { ARCHETYPES } from "../../game/controllers/mobArchetypes/index.js";
import { getInteractablePropTypes } from "../../game/world/interactablePropConfig.js";
import { assetManager } from "../../game/utils/assetManager.js";

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

export function getEditorInteractables() {
    return Object.values(getInteractablePropTypes()).map((p) => {
        const textureId = p.texture ?? p.id;
        const texture = assetManager.getTexture(textureId);
        const previewUrl = assetManager.getTexturePreviewUrl(textureId);

        return {
            id: p.id,
            label: p.label,
            type: 'interactable',
            def: p,
            texture,
            source: previewUrl,
            previewUrl,
            width: texture?.width ?? 64,
            height: texture?.height ?? 64,
            meta: { file: previewUrl },
        };
    });
}