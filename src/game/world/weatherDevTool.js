import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { getWeatherPresetList, WEATHER_PRESETS } from "./weatherPresets.js";

export class WeatherDevTool {
    constructor(weatherController, app) {
        this.weather = weatherController;
        this.app = app;
        this.domElements = [];
        this.visible = false;

        this.container = new Container();
        this.container.zIndex = 99999;
        this.app.stage.addChild(this.container);
        this.app.stage.sortableChildren = true;
        this.container.visible = false;

        this.buildUI();

        window.addEventListener("keydown", (e) => {
            if (e.key === "F3") this.toggle();
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.container.visible = this.visible;
        for (const el of this.domElements) {
            el.style.display = this.visible ? "block" : "none";
        }
        if (this.visible) this.syncControlsFromWeather();
    }

    syncControlsFromWeather() {
        const amb = this.weather.currentAmbient;
        if (this.colorInput) {
            this.colorInput.value = `#${(amb.color >>> 0).toString(16).padStart(6, "0")}`;
        }
        if (this.alphaInput) this.alphaInput.value = String(amb.alpha ?? 0);
        if (this.overrideCheck) this.overrideCheck.checked = this.weather.manualOverride;
    }

    buildUI() {
        const bg = new Graphics()
            .rect(10, 10, 280, 36)
            .fill({ color: 0x000000, alpha: 0.8 });
        this.container.addChild(bg);

        const style = new TextStyle({ fill: 0xffffff, fontSize: 12 });
        const title = new Text("Weather DevTool (F3)", style);
        title.position.set(20, 18);
        this.container.addChild(title);

        this.buildDomPanel();
    }

    buildDomPanel() {
        const panel = document.createElement("div");
        panel.id = "weather-dev-panel";
        Object.assign(panel.style, {
            position: "fixed",
            top: "48px",
            left: "12px",
            width: "280px",
            padding: "12px",
            background: "rgba(0,0,0,0.88)",
            color: "#eee",
            fontFamily: "system-ui, sans-serif",
            fontSize: "12px",
            zIndex: "999999",
            borderRadius: "6px",
            display: "none",
            boxSizing: "border-box",
        });

        const presets = getWeatherPresetList();
        const presetOptions = presets
            .map((p) => `<option value="${p.id}">${p.label}</option>`)
            .join("");

        panel.innerHTML = `
            <div style="margin-bottom:8px;font-weight:600">Preset</div>
            <select id="wd-preset" style="width:100%;margin-bottom:10px">${presetOptions}</select>

            <label style="display:block;margin-bottom:4px">Transition (s)</label>
            <input id="wd-transition" type="range" min="0.5" max="8" step="0.5" value="3" style="width:100%;margin-bottom:10px"/>

            <label style="display:block;margin-bottom:4px">
                <input id="wd-override" type="checkbox"/> Manual override (pause biome cycle)
            </label>

            <button id="wd-apply" style="width:100%;margin-bottom:8px;padding:6px;cursor:pointer">Apply preset</button>
            <button id="wd-resume" style="width:100%;margin-bottom:12px;padding:6px;cursor:pointer">Resume biome cycle</button>

            <div style="border-top:1px solid #444;padding-top:10px;margin-bottom:8px;font-weight:600">Ambient tweak</div>
            <label style="display:block;margin-bottom:4px">Color</label>
            <input id="wd-color" type="color" value="#262626" style="width:100%;margin-bottom:8px;height:28px"/>
            <label style="display:block;margin-bottom:4px">Alpha</label>
            <input id="wd-alpha" type="range" min="0" max="1" step="0.01" value="0.4" style="width:100%;margin-bottom:8px"/>
            <label style="display:block;margin-bottom:4px">Blend mode</label>
            <select id="wd-blend" style="width:100%;margin-bottom:10px">
                <option value="multiply">multiply</option>
                <option value="screen">screen</option>
                <option value="overlay">overlay</option>
                <option value="add">add</option>
                <option value="normal">normal</option>
            </select>

            <div style="font-size:11px;color:#aaa;margin-top:8px">
                Active: <span id="wd-active">—</span>
            </div>
        `;

        document.body.appendChild(panel);
        this.domElements.push(panel);
        this.panel = panel;

        this.presetSelect = panel.querySelector("#wd-preset");
        this.transitionInput = panel.querySelector("#wd-transition");
        this.overrideCheck = panel.querySelector("#wd-override");
        this.colorInput = panel.querySelector("#wd-color");
        this.alphaInput = panel.querySelector("#wd-alpha");
        this.blendSelect = panel.querySelector("#wd-blend");
        this.activeLabel = panel.querySelector("#wd-active");

        panel.querySelector("#wd-apply").onclick = () => this.applyPreset();
        panel.querySelector("#wd-resume").onclick = () => this.resumeCycle();

        this.colorInput.oninput = () => {
            const hex = this.colorInput.value.replace("#", "");
            this.weather.currentAmbient.color = parseInt(hex, 16);
            this.weather.updateAmbientOverlay(1);
        };

        this.alphaInput.oninput = () => {
            this.weather.currentAmbient.alpha = parseFloat(this.alphaInput.value);
            this.weather.updateAmbientOverlay(1);
        };

        this.blendSelect.onchange = () => {
            this.weather.ambientOverlay.blendMode = this.blendSelect.value;
        };

        this.overrideCheck.onchange = () => {
            this.weather.setManualOverride(this.overrideCheck.checked);
        };
    }

    applyPreset() {
        const id = this.presetSelect.value;
        const transition = parseFloat(this.transitionInput.value) || 3;
        this.weather.setManualOverride(this.overrideCheck.checked);
        this.weather.setWeatherPreset(id, transition);
        this.refreshActiveLabel(id);
        this.syncControlsFromWeather();
        const preset = WEATHER_PRESETS[id];
        if (preset?.ambient) {
            const c = preset.ambient.color;
            this.colorInput.value = `#${(c >>> 0).toString(16).padStart(6, "0")}`;
            this.alphaInput.value = String(preset.ambient.alpha);
        }
    }

    resumeCycle() {
        this.overrideCheck.checked = false;
        this.weather.setManualOverride(false);
        const biome = this.weather.activeBiome;
        if (biome) {
            this.weather.setActiveBiome(null);
            this.weather.setActiveBiome(biome);
        }
        this.refreshActiveLabel(this.weather.currentPresetId);
    }

    refreshActiveLabel(id) {
        if (!this.activeLabel) return;
        const label = WEATHER_PRESETS[id]?.label ?? id ?? "—";
        this.activeLabel.textContent = label;
    }
}
