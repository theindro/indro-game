import {VFX} from '../GlobalEffects.js';

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
 */
export function showFloat(wx, wy, msg, color = '#ff6b8a') {
    const d = document.createElement('div');
    d.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'font-family:Nunito',
        'font-size:16px',
        `color:${color}`,
        'font-weight: bold',
        'text-shadow: 1px 1px 0px black',
        'transform:translate(-50%,-50%)',
        'z-index:20',
    ].join(';');
    d.textContent = msg;
    document.body.appendChild(d);

    VFX.floats.push({
        el: d,
        wx, wy,
        vy: -1.3,
        life: 200  // Changed to frames (60 = 1 sec at 60fps)
    });
}

/**
 * Tick all floating texts — call once per frame.
 * @param {number} camX
 * @param {number} camY
 * @param {number} screenW  - app.screen.width
 * @param {number} screenH  - app.screen.height
 */
export function tickFloats(camX, camY, screenW, screenH) {
    // Use VFX.floats directly - no parameter needed!
    for (let i = VFX.floats.length - 1; i >= 0; i--) {
        const f = VFX.floats[i];

        if (!f || !f.el || !f.el.style) {
            console.warn("🧹 Removing broken float:", f);
            VFX.floats.splice(i, 1);
            continue;
        }

        f.wy += f.vy;
        f.life--;
        f.el.style.opacity = f.life / 44;
        f.el.style.left = ((f.wx - camX) + screenW / 2) + 'px';
        f.el.style.top = ((f.wy - camY) + screenH / 2) + 'px';

        if (f.life <= 0) {
            f.el.remove();
            VFX.floats.splice(i, 1);
        }
    }
}