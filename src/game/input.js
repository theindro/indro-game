export function createInputManager(canvas) {
    const keys  = {};
    let mouseX  = window.innerWidth  / 2;
    let mouseY  = window.innerHeight / 2;
    let mouseDown = false;

    const onKeyDown  = e => { keys[e.key.toLowerCase()] = true; };
    const onKeyUp    = e => { keys[e.key.toLowerCase()] = false; };
    const onMove     = e => { mouseX = e.clientX; mouseY = e.clientY; };
    const onMouseDown = () => { mouseDown = true; };
    const onMouseUp   = () => { mouseDown = false; };

    window.addEventListener('keydown',  onKeyDown);
    window.addEventListener('keyup',    onKeyUp);
    window.addEventListener('mouseup',  onMouseUp);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onMouseDown);

    return {
        isDown(key) { return !!keys[key.toLowerCase()]; },
        get mouseX()    { return mouseX; },
        get mouseY()    { return mouseY; },
        get mouseDown() { return mouseDown; },
        destroy() {
            window.removeEventListener('keydown',  onKeyDown);
            window.removeEventListener('keyup',    onKeyUp);
            window.removeEventListener('mouseup',  onMouseUp);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mousedown', onMouseDown);
        },
    };
}