export function createInputManager(canvas) {
    const keys = {};
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    /** Left button held — used for move-to-click / basic attack only. */
    let leftMouseDown = false;
    /** After ability aim ends, ignore LMB until released (confirm or cancel). */
    let suppressFireUntilLeftUp = false;
    /** @type {Set<number>} buttons pressed since last consume */
    const mousePressButtons = new Set();

    const onKeyDown = (e) => {
        keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e) => {
        keys[e.key.toLowerCase()] = false;
    };
    const onMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    };
    const onMouseDown = (e) => {
        mousePressButtons.add(e.button);
        if (e.button === 0) {
            leftMouseDown = true;
        }
        if (e.button === 2) {
            e.preventDefault();
        }
    };
    const onMouseUp = (e) => {
        if (e.button === 0) {
            leftMouseDown = false;
            suppressFireUntilLeftUp = false;
        }
    };
    const onContextMenu = (e) => {
        e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', onContextMenu);

    return {
        isDown(key) {
            return !!keys[key.toLowerCase()];
        },
        get mouseX() {
            return mouseX;
        },
        get mouseY() {
            return mouseY;
        },
        /** Left button held. */
        get mouseDown() {
            return leftMouseDown;
        },
        /** LMB held and not suppressed after ability aim ended. */
        canPrimaryFire() {
            return leftMouseDown && !suppressFireUntilLeftUp;
        },
        /**
         * Call when ability aim preview ends (confirm or cancel).
         * Stops that click from also firing basic attacks.
         */
        notifyAimEnded() {
            suppressFireUntilLeftUp = true;
            mousePressButtons.delete(0);
            mousePressButtons.delete(2);
        },
        /** @param {number} button 0 = left, 2 = right */
        consumeMousePress(button) {
            if (!mousePressButtons.has(button)) return false;
            mousePressButtons.delete(button);
            return true;
        },
        destroy() {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('contextmenu', onContextMenu);
        },
    };
}
