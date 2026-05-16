import { Graphics, Container } from 'pixi.js';
import { shadowManager } from "./createShadowController.js";
import { WeatherDevTool } from "../world/weatherDevTool.js";
import {
    WEATHER_PRESETS,
    BIOME_WEATHER_CYCLES,
    BIOME_DEFAULT_PRESET,
} from "../world/weatherPresets.js";

function normalizeAmbientColor(color) {
    if (typeof color === 'number' && Number.isFinite(color)) return color >>> 0;
    if (color === 'black') return 0x000000;
    return 0x000000;
}

function ambientFromPreset(presetId, intensityMult = 1) {
    const preset = WEATHER_PRESETS[presetId];
    if (!preset) return { color: 0x000000, alpha: 0 };
    return {
        color: normalizeAmbientColor(preset.ambient.color),
        alpha: preset.ambient.alpha * intensityMult,
    };
}

function shadowFromPreset(presetId) {
    const preset = WEATHER_PRESETS[presetId];
    if (!preset) return { x: -25, y: 10, skew: -0.2, alpha: 0.15 };
    return { ...preset.shadow };
}

export class CreateWeatherController {
    constructor(app, world) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.container.zIndex = 999;
        this.app.stage.addChild(this.container);
        this.app.stage.sortableChildren = true;

        this.devtool = new WeatherDevTool(this, app);

        this.currentPresetId = null;
        this.targetPresetId = null;
        this.transitionProgress = 1;
        this.transitionDuration = 2.0;
        this.transitionTimer = 0;
        this.isTransitioning = false;

        this.container.label = 'WeatherController';

        this.currentEffect = null;
        this.targetEffect = null;

        this.currentShadowConfig = { x: -25, y: 0, skew: -0.3, alpha: 0.15 };
        this.targetShadowConfig = { x: -25, y: 0, skew: -0.3, alpha: 0.15 };

        this.ambientOverlay = new Graphics();
        this.ambientOverlay.label = 'ambientOverlay';
        this.ambientOverlay.blendMode = 'multiply';
        this.ambientOverlay.eventMode = 'none';
        this.ambientOverlay.zIndex = 1100;
        this.app.stage.sortableChildren = true;
        this.app.stage.addChild(this.ambientOverlay);
        this.currentAmbient = { color: 0x000000, alpha: 0 };
        this.targetAmbient = { color: 0x000000, alpha: 0 };

        this.manualOverride = false;
        this.activeBiome = null;
        this.biomeCycleIndex = 0;
        this.biomeCycleTimer = 0;
    }

    /** Dev tool / testing: pause biome cycle. */
    setManualOverride(enabled) {
        this.manualOverride = !!enabled;
    }

    setActiveBiome(biome) {
        if (biome === this.activeBiome) return;
        this.activeBiome = biome;
        this.biomeCycleIndex = 0;
        this.biomeCycleTimer = 0;
        if (!this.manualOverride && biome) {
            const defaultId = BIOME_DEFAULT_PRESET[biome];
            if (defaultId) this.setWeatherPreset(defaultId, 2.5);
        }
    }

    updateBiomeWeather(biome, deltaTime) {
        if (this.manualOverride || !biome) return;
        const cycle = BIOME_WEATHER_CYCLES[biome];
        if (!cycle?.length) return;

        if (biome !== this.activeBiome) {
            this.setActiveBiome(biome);
            return;
        }

        const dt = Math.min(deltaTime, 0.05);
        this.biomeCycleTimer += dt;
        const entry = cycle[this.biomeCycleIndex];
        if (entry && this.biomeCycleTimer >= entry.duration) {
            this.biomeCycleTimer = 0;
            this.biomeCycleIndex = (this.biomeCycleIndex + 1) % cycle.length;
            const next = cycle[this.biomeCycleIndex];
            if (next?.preset) this.setWeatherPreset(next.preset, 4);
        }
    }

    setWeatherPreset(presetId, transitionTime = 3.0) {
        const preset = WEATHER_PRESETS[presetId];
        if (!preset) {
            console.warn(`[weather] Unknown preset: ${presetId}`);
            return;
        }

        this.targetPresetId = presetId;
        this.targetAmbient = ambientFromPreset(presetId, 1);
        this.targetShadowConfig = shadowFromPreset(presetId);

        if (preset.ambient.blendMode) {
            this.ambientOverlay.blendMode = preset.ambient.blendMode;
        }

        this.transitionDuration = transitionTime;
        this.transitionTimer = 0;
        this.transitionProgress = 0;
        this.isTransitioning = true;

        if (this.targetEffect) {
            this.targetEffect.destroy();
            this.targetEffect = null;
        }

        const p = preset.particles;
        if (p?.type && p.type !== 'none') {
            this.targetEffect = this.createEffect(p.type, p.intensity ?? 1, p.speed ?? 1, p);
        } else {
            this.targetEffect = null;
        }

        if (!this.currentEffect && !this.currentPresetId) {
            this.currentEffect = this.targetEffect;
            this.currentPresetId = presetId;
            this.currentShadowConfig = { ...this.targetShadowConfig };
            this.isTransitioning = false;
            this.targetEffect = null;
            this.transitionProgress = 1;
            this.currentAmbient = { ...this.targetAmbient };
            shadowManager.setDirection(this.targetShadowConfig);
            this.updateAmbientOverlay(1);
            return;
        }
    }

    /** Legacy API — maps to preset id when defined. */
    setWeather(type, intensity = 1, speed = 1, transitionTime = 2.0) {
        if (WEATHER_PRESETS[type]) {
            this.setWeatherPreset(type, transitionTime);
            return;
        }
        this.setWeatherPreset('clear', transitionTime);
    }

    createEffect(type, intensity, speed, options = {}) {
        switch (type) {
            case 'rain':
                return new RainEffect(this.app, this.container, intensity, speed, options);
            case 'snow':
                return new SnowEffect(this.app, this.container, intensity, speed);
            case 'embers':
                return new EmberEffect(this.app, this.container, intensity, speed);
            case 'sandstorm':
                return new SandstormEffect(this.app, this.container, intensity, speed);
            case 'mist':
            case 'fog':
                return new MistEffect(this.app, this.container, intensity, speed);
            case 'pollen':
                return new PollenEffect(this.app, this.container, intensity, speed, options);
            case 'fireflies':
                return new FireflyEffect(this.app, this.container, intensity, speed);
            case 'heat':
                return new HeatEffect(this.app, this.container, intensity, speed);
            default:
                return null;
        }
    }

    finishTransition() {
        if (!this.isTransitioning) return;

        if (this.currentEffect && this.currentEffect !== this.targetEffect) {
            this.currentEffect.destroy();
        }

        this.currentEffect = this.targetEffect;
        this.currentPresetId = this.targetPresetId;
        this.isTransitioning = false;
        this.transitionProgress = 1;

        shadowManager.setDirection(this.targetShadowConfig);
        this.currentShadowConfig = { ...this.targetShadowConfig };
        this.currentAmbient = {
            color: normalizeAmbientColor(this.targetAmbient.color),
            alpha: this.targetAmbient.alpha,
        };
        this.updateAmbientOverlay(1);
    }

    update(deltaTime) {
        const dt = Math.min(deltaTime, 0.033);

        if (this.isTransitioning) {
            this.transitionTimer += dt;
            this.transitionProgress = Math.min(1, this.transitionTimer / this.transitionDuration);
            const easeProgress = this.easeInOutCubic(this.transitionProgress);

            const fromAmbient = ambientFromPreset(this.currentPresetId ?? 'clear', 1);
            this.currentAmbient = this.interpolateAmbient(fromAmbient, this.targetAmbient, easeProgress);

            const currentShadow = this.interpolateShadow(
                this.currentShadowConfig,
                this.targetShadowConfig,
                easeProgress
            );
            shadowManager.setDirection(currentShadow);

            this.updateAmbientOverlay(1);

            if (this.currentEffect && !this.currentEffect.destroyed) {
                this.currentEffect.update(dt, 1 - easeProgress);
            }
            if (this.targetEffect && !this.targetEffect.destroyed) {
                this.targetEffect.update(dt, easeProgress);
            }

            if (this.transitionProgress >= 1 && this.isTransitioning) {
                this.finishTransition();
            }
        } else if (this.currentEffect) {
            this.currentEffect.update(dt, 1);
        }

        this.updateAmbientOverlay(1);
    }

    interpolateShadow(from, to, progress) {
        return {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
            skew: from.skew + (to.skew - from.skew) * progress,
            alpha: from.alpha + (to.alpha - from.alpha) * progress,
        };
    }

    interpolateAmbient(from, to, progress) {
        const fromColor = normalizeAmbientColor(from.color);
        const toColor = normalizeAmbientColor(to.color);
        const fromR = (fromColor >> 16) & 0xff;
        const fromG = (fromColor >> 8) & 0xff;
        const fromB = fromColor & 0xff;
        const toR = (toColor >> 16) & 0xff;
        const toG = (toColor >> 8) & 0xff;
        const toB = toColor & 0xff;
        const r = Math.floor(fromR + (toR - fromR) * progress);
        const g = Math.floor(fromG + (toG - fromG) * progress);
        const b = Math.floor(fromB + (toB - fromB) * progress);
        return {
            color: (r << 16) | (g << 8) | b,
            alpha: from.alpha + (to.alpha - from.alpha) * progress,
        };
    }

    updateAmbientOverlay(intensity = 1) {
        this.ambientOverlay.clear();
        if (this.currentAmbient.alpha <= 0) return;

        const renderer = this.app.renderer;
        const w = renderer.width;
        const h = renderer.height;
        const pad = 4;
        const fillColor = normalizeAmbientColor(this.currentAmbient.color);

        this.ambientOverlay
            .rect(-pad, -pad, w + pad * 2, h + pad * 2)
            .fill({ color: fillColor, alpha: this.currentAmbient.alpha * intensity });
    }

    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    clear() {
        if (this.currentEffect) {
            this.currentEffect.destroy();
            this.currentEffect = null;
        }
        if (this.targetEffect) {
            this.targetEffect.destroy();
            this.targetEffect = null;
        }
        this.container.removeChildren();
        this.isTransitioning = false;
    }

    destroy() {
        this.clear();
        this.ambientOverlay?.destroy();
        this.app.stage.removeChild(this.container);
        this.container.destroy();
    }
}

class BaseWeatherEffect {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.destroyed = false;
    }

    update() {}

    destroy() {
        this.destroyed = true;
        this.graphics?.destroy();
    }
}

class PollenEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1, options = {}) {
        super(app, container);
        this.speed = speed;
        this.warm = !!options.warm;
        this.particles = [];
        this.count = Math.floor(80 * intensity);
        for (let i = 0; i < this.count; i++) this.particles.push(this.spawn());
    }

    spawn() {
        const warm = this.warm;
        return {
            x: Math.random() * this.app.screen.width,
            y: Math.random() * this.app.screen.height,
            vx: (Math.random() - 0.5) * 18 * this.speed,
            vy: (-8 - Math.random() * 22) * this.speed,
            size: 1 + Math.random() * 2.2,
            wobble: Math.random() * Math.PI * 2,
            color: warm
                ? (Math.random() > 0.5 ? 0xffcc88 : 0xffaa55)
                : (Math.random() > 0.5 ? 0xfff8e0 : 0xd8f0c8),
            alpha: 0.25 + Math.random() * 0.35,
        };
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.particles) {
            p.wobble += dt * 1.2;
            p.x += (p.vx + Math.sin(p.wobble) * 6) * dt;
            p.y += p.vy * dt;
            if (p.y < -20 || p.x < -30 || p.x > w + 30) {
                Object.assign(p, this.spawn());
                p.y = h + 10;
            }
            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: p.color, alpha: p.alpha * intensity });
        }
    }
}

class FireflyEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.particles = [];
        this.count = Math.floor(55 * intensity);
        for (let i = 0; i < this.count; i++) this.particles.push(this.spawn());
    }

    spawn() {
        return {
            x: Math.random() * this.app.screen.width,
            y: Math.random() * this.app.screen.height,
            vx: (Math.random() - 0.5) * 35 * this.speed,
            vy: (Math.random() - 0.5) * 28 * this.speed,
            phase: Math.random() * Math.PI * 2,
            pulse: 0.8 + Math.random() * 1.4,
            size: 1.5 + Math.random() * 2.5,
            color: Math.random() > 0.35 ? 0xaaff66 : 0xffee55,
        };
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const t = performance.now() * 0.001;
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.particles) {
            p.phase += dt * p.pulse;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) Object.assign(p, this.spawn());

            const glow = 0.35 + Math.sin(t * 3 + p.phase) * 0.35;
            const a = glow * intensity;
            this.graphics.circle(p.x, p.y, p.size * 2.2)
                .fill({ color: p.color, alpha: a * 0.15 });
            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: p.color, alpha: a * 0.85 });
        }
    }
}

class MistEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.patches = [];
        const n = Math.floor(12 * intensity);
        for (let i = 0; i < n; i++) {
            this.patches.push({
                x: Math.random() * app.screen.width,
                y: Math.random() * app.screen.height,
                vx: (20 + Math.random() * 40) * speed,
                radius: 80 + Math.random() * 140,
                alpha: 0.04 + Math.random() * 0.06,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.patches) {
            p.phase += dt * 0.4;
            p.x += p.vx * dt;
            if (p.x > w + p.radius) {
                p.x = -p.radius;
                p.y = Math.random() * h;
            }
            const driftY = Math.sin(p.phase) * 12;
            this.graphics.circle(p.x, p.y + driftY, p.radius)
                .fill({ color: 0xdde8f4, alpha: p.alpha * intensity });
        }
    }
}

class HeatEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.particles = [];
        this.count = Math.floor(40 * intensity);
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * app.screen.width,
                y: app.screen.height * (0.5 + Math.random() * 0.5),
                vy: (-40 - Math.random() * 80) * speed,
                size: 2 + Math.random() * 4,
                alpha: 0.08 + Math.random() * 0.12,
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.particles) {
            p.y += p.vy * dt;
            p.x += Math.sin(p.y * 0.02) * 0.8;
            if (p.y < h * 0.35) {
                p.y = h * (0.55 + Math.random() * 0.4);
                p.x = Math.random() * w;
            }
            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: 0xffdd99, alpha: p.alpha * intensity });
        }
    }
}

class EmberEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.baseIntensity = intensity;
        this.speed = speed;
        this.particles = [];
        this.screenWidth = app.screen.width;
        this.screenHeight = app.screen.height;
        const particleCount = Math.floor(300 * intensity);
        const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xff3300];
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.screenWidth,
                y: Math.random() * this.screenHeight,
                vx: (Math.random() - 0.5) * 120 * speed,
                vy: (-50 - Math.random() * 150) * speed,
                size: 2 + Math.random(),
                color: colors[Math.floor(Math.random() * colors.length)],
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.04,
                life: 0.5 + Math.random() * 0.5,
                fade: 0.003 + Math.random() * 0.007,
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const sw = this.app.screen.width;
        const sh = this.app.screen.height;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.wobble += p.wobbleSpeed * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.fade * dt;
            const flicker = 0.6 + Math.sin(Date.now() * 0.008 * p.size) * 0.4;
            const finalAlpha = Math.min(0.8, p.life * flicker) * intensity;

            if (p.life <= 0 || p.y < -50 || p.y > sh + 50 || p.x < -50 || p.x > sw + 50) {
                p.x = Math.random() * sw;
                p.y = Math.random() * sh;
                p.life = 0.5 + Math.random() * 0.5;
                continue;
            }

            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: p.color, alpha: finalAlpha });
            this.graphics.circle(p.x, p.y, p.size * 0.6)
                .fill({ color: 0xffaa66, alpha: finalAlpha * 0.7 });
        }
    }
}

class RainEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1, options = {}) {
        super(app, container);
        this.speed = speed;
        this.wind = options.wind ?? 0.25;
        this.particles = [];
        this.count = Math.floor(320 * intensity);
        for (let i = 0; i < this.count; i++) this.particles.push(this.spawn());
    }

    spawn() {
        return {
            x: Math.random() * this.app.screen.width,
            y: Math.random() * this.app.screen.height,
            speed: (10 + Math.random() * 12) * 60 * this.speed,
            length: 12 + Math.random() * 18,
            alpha: 0.35 + Math.random() * 0.45,
            width: 0.8 + Math.random() * 0.8,
        };
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        const dx = this.wind * 8;

        for (const p of this.particles) {
            p.y += p.speed * dt;
            p.x += dx * p.speed * dt * 0.015;
            if (p.y > h) {
                p.y = -p.length;
                p.x = Math.random() * w;
            }
            this.graphics
                .moveTo(p.x, p.y)
                .lineTo(p.x - dx * p.length * 0.15, p.y + p.length)
                .stroke({
                    width: p.width,
                    color: 0x9ec8ff,
                    alpha: p.alpha * intensity,
                });
        }
    }
}

class SnowEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.particles = [];
        const count = Math.floor(200 * intensity);
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * app.screen.width,
                y: Math.random() * app.screen.height,
                vy: (60 + Math.random() * 120) * speed,
                vx: (Math.random() - 0.5) * 40 * speed,
                size: 2 + Math.random() * 3,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.04,
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.wobble += p.wobbleSpeed * dt;
            if (p.y > h) {
                p.y = 0;
                p.x = Math.random() * w;
            }
            if (p.x > w) p.x = 0;
            if (p.x < 0) p.x = w;
            this.graphics.circle(p.x + Math.sin(p.wobble) * 5, p.y, p.size)
                .fill({ color: 0xffffff, alpha: 0.85 * intensity });
        }
    }
}

class SandstormEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.particles = [];
        const count = Math.floor(400 * intensity);
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * app.screen.width,
                y: Math.random() * app.screen.height,
                vx: (80 + Math.random() * 160) * speed,
                size: 1 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.35,
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;
        this.graphics.clear();
        const dt = Math.min(deltaTime, 0.05);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.particles) {
            p.x += p.vx * dt;
            if (p.x > w) {
                p.x = 0;
                p.y = Math.random() * h;
            }
            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: 0xccaa77, alpha: p.alpha * intensity });
        }
    }
}
