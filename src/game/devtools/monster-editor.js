import * as PIXI from 'pixi.js';

(async () => {
    const app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        background: '#0b0b14',
        antialias: true
    });

    // IMPORTANT for PixiJS 8
    app.stage.eventMode = 'static';

    document.body.appendChild(app.canvas);

// =========================
// ROOT
// =========================
    const stage = new PIXI.Container();
    app.stage.addChild(stage);

// =========================
// STATE
// =========================
    let points = generateInitialVoidShape(140);
    let bodyG = new PIXI.Graphics();
    let handles = [];
    let selected = null;

// =========================
// VOIDPET SHAPE RENDER
// =========================
    function drawShape(g, pts) {
        g.clear();

        const p = pts;

        g.moveTo(p[0].x, p[0].y);

        for (let i = 1; i < p.length - 2; i += 3) {
            g.bezierCurveTo(
                p[i].x, p[i].y,
                p[i + 1].x, p[i + 1].y,
                p[i + 2].x, p[i + 2].y
            );
        }

        g.closePath();

        g.fill({color: 0x7c5cff, alpha: 1});
        g.stroke({width: 3, color: 0x2a1a4a, alpha: 0.6});
    }

// =========================
// VOIDPET INITIAL SHAPE
// =========================
    function generateInitialVoidShape(size) {
        return [
            {x: 0, y: -size},

            {x: -size * 0.9, y: -size * 0.6},
            {x: -size * 1.2, y: 0},
            {x: -size * 0.6, y: size * 0.8},

            {x: -size * 0.2, y: size * 1.1},
            {x: size * 0.3, y: size * 0.9},
            {x: size * 0.9, y: 0},

            {x: size * 0.7, y: -size * 0.8},
            {x: size * 0.2, y: -size * 1.1},
            {x: 0, y: -size}
        ];
    }

// =========================
// CREATE VOIDPET
// =========================
    function createVoidPet(x, y) {
        const c = new PIXI.Container();
        c.x = x;
        c.y = y;

        const g = new PIXI.Graphics();
        c.addChild(g);

        c.shape = points.map(p => ({...p}));

        drawShape(g, c.shape);

        stage.addChild(c);

        createHandles(c, g);

        return c;
    }

// =========================
// DRAG POINT HANDLES
// =========================
    function createHandles(container, gfx) {
        handles.forEach(h => h.destroy());
        handles = [];

        container.shape.forEach((p, i) => {
            const h = new PIXI.Graphics()
                .circle(0, 0, 6)
                .fill({color: i === 0 ? 0xffcc00 : 0x00d4ff});

            h.x = container.x + p.x;
            h.y = container.y + p.y;

            h.eventMode = 'static';
            h.cursor = 'pointer';

            let dragging = false;

            h.on('pointerdown', () => {
                dragging = true;
                selected = i;
            });

            app.stage.on('pointermove', (e) => {
                console.log('here pointer move');
                if (!dragging) return;

                const pos = e.global;

                h.x = pos.x;
                h.y = pos.y;

                container.shape[i].x = pos.x - container.x;
                container.shape[i].y = pos.y - container.y;

                drawShape(gfx, container.shape);
            });

            h.on('pointerup', () => dragging = false);
            h.on('pointerupoutside', () => dragging = false);

            app.stage.addChild(h);
            handles.push(h);
        });
    }

// =========================
// SAVE SHAPE
// =========================
    function saveShape() {
        const pet = stage.children[0]; // your active voidpet

        if (!pet?.shape) return;

        const data = JSON.stringify(pet.shape);

        console.log("SAVED SHAPE:", data);
        localStorage.setItem("voidpet_shape", data);
    }

// =========================
// LOAD SHAPE
// =========================
    function loadShape() {
        const data = localStorage.getItem("voidpet_shape");
        if (!data) return;

        points = JSON.parse(data);
        stage.removeChildren();

        bodyG = new PIXI.Graphics();
        stage.addChild(bodyG);

        createVoidPet(app.screen.width / 2, app.screen.height / 2);
    }

// =========================
// UI
// =========================
    const btn = document.createElement('button');
    btn.innerText = "Save Shape";
    btn.style.position = "fixed";
    btn.style.top = "10px";
    btn.style.left = "10px";
    btn.onclick = saveShape;
    document.body.appendChild(btn);

    const btn2 = document.createElement('button');
    btn2.innerText = "Load Shape";
    btn2.style.position = "fixed";
    btn2.style.top = "40px";
    btn2.style.left = "10px";
    btn2.onclick = loadShape;
    document.body.appendChild(btn2);

// =========================
// INIT
// =========================
    createVoidPet(app.screen.width / 2, app.screen.height / 2);
})();