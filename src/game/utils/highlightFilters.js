import { OutlineFilter } from 'pixi-filters';

export const CURSOR_DEFAULT =
    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"27\" viewBox=\"0 0 24 27\"><polygon points=\"2,2 22,13 12,13 9,25\" fill=\"%23ffaa44\" stroke=\"%23000\" stroke-width=\"2\"/><circle cx=\"6\" cy=\"8\" r=\"2\" fill=\"white\"/></svg>') 4 2, auto";

export const CURSOR_SWORD =
    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\"><path d=\"M4 24 L14 4 L18 10 L24 8 L10 22 Z\" fill=\"%23e8e8f0\" stroke=\"%23000\" stroke-width=\"1.5\"/><path d=\"M4 24 L8 20\" stroke=\"%23888\" stroke-width=\"2\"/></svg>') 10 6, auto";

export const HOVER_OUTLINE_FILTER = new OutlineFilter({
    thickness: 2,
    color: 0xffee88,
    alpha: 0.75,
    quality: 0.4,
});

export const AGGRO_OUTLINE_FILTER = new OutlineFilter({
    thickness: 1,
    color: 0xff4422,
    alpha: 0,
    quality: 0.4,
});

export const INTERACTABLE_HOVER_FILTER = new OutlineFilter({
    thickness: 2,
    color: 0xffffff,
    alpha: 0.75,
    quality: 0.4,
});

/**
 * @param {import('pixi.js').Sprite|undefined} body
 * @param {{ _highlightHover?: boolean }} entity
 * @param {boolean} isAggro
 */
export function applyEntityOutlineFilter(body, entity, isAggro) {
    if (!body) return;
    const hover = !!entity._highlightHover;
    if (isAggro) {
        body.filters = [AGGRO_OUTLINE_FILTER];
    } else if (hover) {
        body.filters = [HOVER_OUTLINE_FILTER];
    } else {
        body.filters = null;
    }
}

export function bindMobHighlightPointer(mob) {
    const { body } = mob;
    if (!body) return;
    mob._highlightHover = false;
    body.eventMode = 'static';
    body.cursor = CURSOR_SWORD;
    body.on('pointerover', () => { mob._highlightHover = true; });
    body.on('pointerout', () => { mob._highlightHover = false; });
}

export function bindBossHighlightPointer(boss) {
    const { body } = boss;
    if (!body) return;
    boss._highlightHover = false;
    body.eventMode = 'static';
    body.cursor = CURSOR_SWORD;
    body.on('pointerover', () => { boss._highlightHover = true; });
    body.on('pointerout', () => { boss._highlightHover = false; });
}
