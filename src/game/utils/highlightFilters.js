import { Graphics } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { CURSOR_GAME_SWORD } from './gameCursor.js';
import { getBossHitRadius, getMobHitRadius } from '../combat/mobHitbox.js';

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

/**
 * @param {import('pixi.js').Container} root
 * @param {number} radius
 * @param {import('pixi.js').Graphics | null | undefined} existing
 */
function ensureHitAreaGfx(root, radius, existing) {
    let hitArea = existing;
    if (!hitArea || hitArea.destroyed) {
        hitArea = new Graphics();
        hitArea.zIndex = 50;
        hitArea.eventMode = 'static';
        hitArea.cursor = CURSOR_GAME_SWORD;
        root.addChild(hitArea);
    }

    hitArea.clear();
    hitArea.circle(0, 0, radius).fill({ color: 0xffffff, alpha: 0.001 });
    return hitArea;
}

/**
 * @param {object} mob
 */
export function bindMobHighlightPointer(mob) {
    const root = mob.bodyC ?? mob.c;
    if (!root) return;

    const radius = getMobHitRadius(mob);
    mob._hitRadius = radius;

    mob._hitAreaGfx = ensureHitAreaGfx(root, radius, mob._hitAreaGfx);

    if (mob.body) {
        mob.body.eventMode = 'none';
        mob.body.cursor = 'default';
    }

    mob._highlightHover = false;

    if (!mob._hitAreaBound) {
        mob._hitAreaGfx.on('pointerover', () => { mob._highlightHover = true; });
        mob._hitAreaGfx.on('pointerout', () => { mob._highlightHover = false; });
        mob._hitAreaBound = true;
    }
}

/**
 * @param {object} boss
 */
export function bindBossHighlightPointer(boss) {
    const root = boss.bodyC ?? boss.c;
    if (!root) return;

    const radius = getBossHitRadius(boss);
    boss._hitRadius = radius;

    boss._hitAreaGfx = ensureHitAreaGfx(root, radius, boss._hitAreaGfx);

    if (boss.body) {
        boss.body.eventMode = 'none';
        boss.body.cursor = 'default';
    }

    boss._highlightHover = false;

    if (!boss._hitAreaBound) {
        boss._hitAreaGfx.on('pointerover', () => { boss._highlightHover = true; });
        boss._hitAreaGfx.on('pointerout', () => { boss._highlightHover = false; });
        boss._hitAreaBound = true;
    }
}
