import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class WeatherDevTool {
    constructor(weatherController, app) {
        this.weather = weatherController;
        this.app = app;

        this.domElements = []; // 👈 ADD THIS

        this.container = new Container();
        this.container.zIndex = 99999;
        this.app.stage.addChild(this.container);
        this.app.stage.sortableChildren = true;

        this.visible = false;

        this.buildUI();

        window.addEventListener("keydown", (e) => {
            if (e.key === "F3") {
                this.toggle();
            }
        });

        this.container.visible = false;

        for (const el of this.domElements) {
            el.style.display = "none";
        }
    }

    toggle() {
        this.visible = !this.visible;

        // Pixi container
        this.container.visible = this.visible;

        // DOM elements
        for (const el of this.domElements) {
            el.style.display = this.visible ? "block" : "none";
        }
    }

    buildUI() {
        const bg = new Graphics()
            .rect(10, 10, 260, 220)
            .fill({ color: 0x000000, alpha: 0.75 });

        this.container.addChild(bg);

        const style = new TextStyle({
            fill: 0xffffff,
            fontSize: 12
        });

        // Title
        const title = new Text("Weather DevTool (F3)", style);
        title.position.set(20, 15);
        this.container.addChild(title);

        // --- AMBIENT COLOR INPUT ---
        this.addLabel("Ambient Color (hex)", 40);

        const colorInput = this.createInput("#262626", 40);
        colorInput.oninput = (e) => {
            const hex = parseInt(e.target.value.replace("#", "0x"));
            this.weather.currentAmbient.color = hex;
            this.weather.updateAmbientOverlay(1);
        };

        // --- ALPHA ---
        this.addLabel("Ambient Alpha", 80);

        const alphaInput = this.createRange(0, 1, 0.01, 0.7, 80);
        alphaInput.oninput = (e) => {
            this.weather.currentAmbient.alpha = parseFloat(e.target.value);
            this.weather.updateAmbientOverlay(1);
        };

        // --- BLEND MODE ---
        this.addLabel("Blend Mode", 120);

        const blendInput = this.createSelect([
            "multiply",
            "add",
            "screen",
            "overlay",
            "normal"
        ], 120);

        blendInput.onchange = (e) => {
            this.weather.ambientOverlay.blendMode = e.target.value;
        };

        // --- QUICK WEATHER TEST ---
        this.addLabel("Weather Presets", 160);

        const btnRain = this.createButton("Rain", 160, () =>
            this.weather.setWeather("rain", 1, 1, 1)
        );

        const btnFog = this.createButton("Fog", 190, () =>
            this.weather.setWeather("fog", 1, 1, 1)
        );

        const btnSnow = this.createButton("Snow", 220, () =>
            this.weather.setWeather("snow", 1, 1, 1)
        );
    }

    addLabel(text, y) {
        const label = new Text(text, {
            fill: 0xffffff,
            fontSize: 11
        });
        label.position.set(20, y);
        this.container.addChild(label);
    }

    createInput(value, y) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value;

        this.styleInput(input, y);

        document.body.appendChild(input);
        this.domElements.push(input); // 👈 ADD

        return input;
    }

    createRange(min, max, step, value, y) {
        const input = document.createElement("input");
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;

        this.styleInput(input, y);

        document.body.appendChild(input);
        this.domElements.push(input); // 👈 ADD

        return input;
    }

    createSelect(options, y) {
        const select = document.createElement("select");

        options.forEach(opt => {
            const o = document.createElement("option");
            o.value = opt;
            o.innerText = opt;
            select.appendChild(o);
        });

        this.styleInput(select, y);

        document.body.appendChild(select);
        this.domElements.push(select); // 👈 ADD

        return select;
    }

    createButton(text, y, onClick) {
        const btn = document.createElement("button");
        btn.innerText = text;
        btn.onclick = onClick;

        this.styleInput(btn, y);

        document.body.appendChild(btn);
        this.domElements.push(btn); // 👈 ADD

        return btn;
    }

    styleInput(el, y) {
        el.style.position = "absolute";
        el.style.left = "20px";
        el.style.top = `${y}px`;
        el.style.zIndex = 999999;
        el.style.padding = "4px";
        el.style.fontSize = "12px";
    }
}