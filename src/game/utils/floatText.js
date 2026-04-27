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
 * @param {FloatText[]} floats   - mutable array
 * @param {number} wx
 * @param {number} wy
 * @param {string} msg
 * @param {string} [color='#ff6b8a']
 */
export function showFloat(floats, wx, wy, msg, color = '#ff6b8a') {
    const d = document.createElement('div');
    d.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'font-family:Nunito',
        'font-size:16px',
        `color:${color}`,
        `font-weight: bold`,
        'transform:translate(-50%,-50%)',
        'z-index:20',
    ].join(';');
    d.textContent = msg;
    document.body.appendChild(d);
    floats.push({ el: d, wx, wy, vy: -1.3, life: 200 });
}

/**
 * Tick all floating texts — call once per frame.
 * @param {FloatText[]} floats
 * @param {number} camX
 * @param {number} camY
 * @param {number} screenW  - app.screen.width
 * @param {number} screenH  - app.screen.height
 */
export function tickFloats(floats, camX, camY, screenW, screenH) {
    for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];

        if (!f || !f.el || !f.el.style) {
            console.warn("🧹 Removing broken float:", f);
            floats.splice(i, 1);
            continue;
        }

        f.wy  += f.vy;
        f.life--;
        f.el.style.opacity = f.life / 44;
        f.el.style.left = ((f.wx - camX) + screenW / 2) + 'px';
        f.el.style.top  = ((f.wy - camY) + screenH / 2) + 'px';
        if (f.life <= 0) {
            f.el.remove();
            floats.splice(i, 1);
        }
    }
}