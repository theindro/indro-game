import { Application, Graphics, RenderTexture, Sprite, Container } from 'pixi.js';

(async () => {


    const app = new Application();

    await app.init({
        width: 800,
        height: 600,
        background: 0x1e1e1e,
    });

    document.body.appendChild(app.canvas);

    app.stage.sortableChildren = true;

// =====================================================
// WORLD (your game)
// =====================================================
    const world = new Graphics()
        .rect(0, 0, 800, 600).fill(0x1e3a8a)
        .rect(100, 100, 200, 200).fill(0xef4444)
        .rect(400, 200, 250, 200).fill(0x22c55e);

    app.stage.addChild(world);

// =====================================================
// DARKNESS TARGET (final overlay texture)
// =====================================================
    const darknessRT = RenderTexture.create({ width: 800, height: 600 });

    const darknessSprite = new Sprite(darknessRT);
    darknessSprite.zIndex = 10;
    app.stage.addChild(darknessSprite);

// =====================================================
// IMPORTANT: isolated container (THIS FIXES EVERYTHING)
// =====================================================
    const lightContainer = new Container();

// DO NOT add to stage directly
// ONLY render it manually into RT

    const brush = new Graphics();
    lightContainer.addChild(brush);

// =====================================================
// mouse control
// =====================================================
    let mx = 400;
    let my = 300;

    app.canvas.addEventListener('mousemove', (e) => {
        const r = app.canvas.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
    });

// =====================================================
// loop
// =====================================================
    app.ticker.add(() => {

        // ---------------------------------------------
        // STEP 1: full darkness
        // ---------------------------------------------
        const g = new Graphics();
        g.rect(0, 0, 800, 600).fill({
            color: 0x000000,
            alpha: 0.85
        });

        app.renderer.render({
            container: g,
            target: darknessRT,
            clear: true,
        });

        // ---------------------------------------------
        // STEP 2: LIGHT MASK (erase mode INSIDE container)
        // ---------------------------------------------
        brush.clear();
        brush.blendMode = 'erase';

        const radius = 180;
        const steps = 30;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;

            // smaller = center, bigger = edge
            const r = radius * (1 - t);

            // center strong erase, edges weak erase
            const alpha = t;

            brush.circle(mx, my, r).fill({
                color: 0xffffff,
                alpha
            });
        }
        // IMPORTANT: render isolated container
        app.renderer.render({
            container: lightContainer,
            target: darknessRT,
            clear: false, // MUST be false or you overwrite darkness
        });

    });

})();