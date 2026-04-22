/**
 * Creates a self-contained input manager.
 * Call `.destroy()` to remove all listeners.
 */
export function createInputManager(canvas) {
    const keys  = {};
    let mouseX  = window.innerWidth  / 2;
    let mouseY  = window.innerHeight / 2;

    const onKeyDown = e => { keys[e.key.toLowerCase()] = true;  };
    const onKeyUp   = e => { keys[e.key.toLowerCase()] = false; };
    const onMove    = e => { mouseX = e.clientX; mouseY = e.clientY; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    canvas.addEventListener('mousemove', onMove);

    return {
        /** @returns {boolean} */
        isDown(key) { return !!keys[key.toLowerCase()]; },
        get mouseX() { return mouseX; },
        get mouseY() { return mouseY; },
        destroy() {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup',   onKeyUp);
            canvas.removeEventListener('mousemove', onMove);
        },
    };
}