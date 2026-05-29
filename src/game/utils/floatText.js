import {VFX} from '../GlobalEffects.js';
import {frameScale} from '../constants.js';

/**
 * @typedef FloatText
 * @property {HTMLDivElement} el
 * @property {number} wx  - world x
 * @property {number} wy  - world y (mutated each frame)
 * @property {number} vy
 * @property {number} life
 */

/**
 * Spawn a floating text label at world position (wx, wy).
 * @param {number} wx
 * @param {number} wy
 * @param {string} msg
 * @param {string} [color='#ff6b8a']
 * @param {{ fontSize?: number, opacity?: number }} [opts]
 */
export function showFloat(wx, wy, msg, color = '#ffb347', opts = {}) {
    const fontSize = opts.fontSize ?? 18;
    const baseOpacity = opts.opacity ?? 1;

    const d = document.createElement('div');

    d.style.cssText = [
        'position:fixed',
        'pointer-events:none',

        // Better font
        'font-family:"Teko", "Rajdhani", sans-serif',

        `font-size:${fontSize}px`,
        `opacity:${baseOpacity}`,
        `color:${color}`,

        // Diablo style
        'font-weight:900',
        'letter-spacing:0.5px',
        'text-transform:uppercase',

        // Crisp rendering
        '-webkit-font-smoothing:none',
        'text-rendering:geometricPrecision',

        `text-shadow: 0 4px 6px rgba(0,0,0,0.15)`,

        'transform:translate(-50%,-50%) scale(1)',
        'z-index:20',
        'user-select:none',
        'will-change:transform, opacity',
    ].join(';');

    d.textContent = msg;

    document.body.appendChild(d);

    VFX.floats.push({
        el: d,
        wx,
        wy,
        vy: -1.15,
        life: 60,
        baseOpacity,
        scale: 1.25,
    });
}
/**
 * Tick all floating texts — call once per frame.
 * @param {number} camX
 * @param {number} camY
 * @param {number} screenW  - app.screen.width
 * @param {number} screenH  - app.screen.height
 * @param {number} dtSec  capped tick time in seconds (same as main loop dt)
 */
export function tickFloats(camX, camY, screenW, screenH, dtSec = 1 / 60) {
    const fs = frameScale(dtSec);
    // Use VFX.floats directly - no parameter needed!
    for (let i = VFX.floats.length - 1; i >= 0; i--) {
        const f = VFX.floats[i];

        if (!f || !f.el || !f.el.style) {
            console.warn("🧹 Removing broken float:", f);
            VFX.floats.splice(i, 1);
            continue;
        }

        f.wy += f.vy * fs;
        f.life -= fs;
        const fade = Math.max(0, f.life / 44);
        f.el.style.opacity = String((f.baseOpacity ?? 0.5) * fade);
        f.el.style.left = ((f.wx - camX) + screenW / 2) + 'px';
        f.el.style.top = ((f.wy - camY) + screenH / 2) + 'px';

        if (f.life <= 0) {
            f.el.remove();
            VFX.floats.splice(i, 1);
        }
    }
}