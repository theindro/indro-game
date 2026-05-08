import {Graphics, RenderTexture, Sprite, Container} from 'pixi.js';

export class createLightingController {
    constructor(app, width, height) {
        this.app = app;
        this.width = width;
        this.height = height;

        // final darkness texture
        this.darknessRT = RenderTexture.create({width, height});
        this.darknessSprite = new Sprite(this.darknessRT);
        this.darknessSprite.zIndex = 999;

        app.stage.addChild(this.darknessSprite);

        // isolated light layer
        this.lightContainer = new Container();

        this.brush = new Graphics();
        this.lightContainer.addChild(this.brush);

        this.lights = [];

        this.darknessAlpha = 0.2;

        this.darknessGraphic = new Graphics();

        this.app.ticker.add(this.update.bind(this));
    }

    // ---------------------------------------------
    // API: add light
    // ---------------------------------------------
    addLight(x, y, radius = 150, strength = 1) {
        const light = {
            x,
            y,
            radius,
            strength,
            active: true,
        };

        this.lights.push(light);
        return light;
    }

    removeLight(light) {
        const i = this.lights.indexOf(light);
        if (i !== -1) this.lights.splice(i, 1);
    }

    setDarkness(value) {
        this.darknessAlpha = value;
    }

    // ---------------------------------------------
    // update loop
    // ---------------------------------------------
    update() {

        // STEP 1: full darkness
        this.darknessGraphic.clear()
            .rect(0, 0, this.width, this.height)
            .fill({
                color: 0x000000,
                alpha: this.darknessAlpha
            });

        this.app.renderer.render({
            container: this.darknessGraphic,
            target: this.darknessRT,
            clear: true,
        });

        // STEP 2: erase lights
        this.brush.clear();
        this.brush.blendMode = 'erase';

        for (const light of this.lights) {

            if (!light.active) continue;

            const steps = 100;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;

                const r = light.radius * (1 - t);

                // smooth falloff (center strong, edge weak)
                const alpha = Math.pow(t, 2) * light.strength;

                this.brush.circle(light.x, light.y, r).fill({
                    color: 0xffffff,
                    alpha
                });
            }
        }

        // render light mask
        this.app.renderer.render({
            container: this.lightContainer,
            target: this.darknessRT,
            clear: false,
        });
    }
}