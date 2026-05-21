/**
 * Game cursors — Pixi sets `canvas.style.cursor` from displayObject.cursor.
 * CSS keyword "default" is the OS arrow; use named keys + cursorStyles instead.
 */

export const CURSOR_DEFAULT =
    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"27\" viewBox=\"0 0 24 27\"><polygon points=\"2,2 22,13 12,13 9,25\" fill=\"%23ffaa44\" stroke=\"%23000\" stroke-width=\"2\"/><circle cx=\"6\" cy=\"8\" r=\"2\" fill=\"white\"/></svg>') 4 2, auto";

export const CURSOR_SWORD =
    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><defs><filter id=\"s\"><feDropShadow dx=\"0\" dy=\"1\" stdDeviation=\"1\" flood-opacity=\"0.45\"/></filter></defs><g transform=\"rotate(-25 16 16)\" filter=\"url(%23s)\"><rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\" fill=\"%23dfe6ee\" stroke=\"%23000\" stroke-width=\"1.5\"/><polygon points=\"16,1 20,6 12,6\" fill=\"%23f4f7fa\" stroke=\"%23000\" stroke-width=\"1.2\"/><rect x=\"10\" y=\"18\" width=\"12\" height=\"3\" rx=\"1\" fill=\"%23c98a2e\" stroke=\"%23000\" stroke-width=\"1.2\"/><rect x=\"14\" y=\"21\" width=\"4\" height=\"7\" rx=\"1\" fill=\"%23553322\" stroke=\"%23000\" stroke-width=\"1.2\"/></g></svg>') 16 5, auto";

export const CURSOR_GRAB =
    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"27\" viewBox=\"0 0 24 27\"><polygon points=\"2,2 22,13 12,13 9,25\" fill=\"%23ffaa44\" stroke=\"%23000\" stroke-width=\"2\"/><circle cx=\"6\" cy=\"8\" r=\"2\" fill=\"white\"/></svg>') 4 2, auto";

/** Pixi FederatedPointerEvent cursor lookup keys (not CSS keywords). */
export const CURSOR_GAME_DEFAULT = 'game-default';
export const CURSOR_GAME_SWORD = 'game-sword';
export const CURSOR_GAME_GRAB = 'game-grab';

/** @type {HTMLCanvasElement | null} */
let gameCanvas = null;

/**
 * Register custom cursors on the Pixi renderer (call once after Application.init).
 * @param {import('pixi.js').Application} app
 */
export function initPixiCursors(app) {
    gameCanvas = app.canvas ?? null;

    const styles = app.renderer?.events?.cursorStyles;
    if (styles) {
        styles.default = CURSOR_DEFAULT;
        styles[CURSOR_GAME_DEFAULT] = CURSOR_DEFAULT;
        styles[CURSOR_GAME_SWORD] = CURSOR_SWORD;
        styles[CURSOR_GAME_GRAB] = CURSOR_GRAB;
    }

    if (gameCanvas) {
        gameCanvas.style.cursor = CURSOR_DEFAULT;
    }
}

function setCanvasCursor(css) {
    if (gameCanvas) {
        gameCanvas.style.cursor = css;
    }
}

/** Custom game arrow on canvas (and when not over a Pixi target). */
export function applyDefaultGameCursor() {
    if (typeof document !== 'undefined') {
        document.documentElement.dataset.gameCursor = 'default';
    }
    setCanvasCursor(CURSOR_DEFAULT);
}

/** OS default — title / death / system UI. */
export function applySystemCursor() {
    if (typeof document !== 'undefined') {
        document.documentElement.dataset.gameCursor = 'system';
    }
    setCanvasCursor('default');
}
