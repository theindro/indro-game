import { OutlineFilter } from 'pixi-filters';
import { CURSOR_GAME_SWORD } from './gameCursor.js';

export {
    CURSOR_DEFAULT,
    CURSOR_SWORD,
    CURSOR_GRAB,
    CURSOR_GAME_DEFAULT,
    CURSOR_GAME_SWORD,
    CURSOR_GAME_GRAB,
} from './gameCursor.js';

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

    if (hover) {
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
    body.cursor = CURSOR_GAME_SWORD;
    body.on('pointerover', () => { mob._highlightHover = true; });
    body.on('pointerout', () => { mob._highlightHover = false; });
}

export function bindBossHighlightPointer(boss) {
    const { body } = boss;
    if (!body) return;
    boss._highlightHover = false;
    body.eventMode = 'static';
    body.cursor = CURSOR_GAME_SWORD;
    body.on('pointerover', () => { boss._highlightHover = true; });
    body.on('pointerout', () => { boss._highlightHover = false; });
}
