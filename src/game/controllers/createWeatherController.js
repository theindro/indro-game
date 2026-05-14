import { Graphics, Container } from 'pixi.js';
import { shadowManager } from "./createShadowController.js";
import {WeatherDevTool} from "../world/weatherDevTool.js";

export class CreateWeatherController {
    constructor(app, world) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.container.zIndex = 999;
        this.app.stage.addChild(this.container);
        this.app.stage.sortableChildren = true;

        this.devtool = new WeatherDevTool(this, app);

        // Transition system
        this.currentWeatherType = null;
        this.targetWeatherType = null;
        this.transitionProgress = 1; // 1 = fully on current, 0 = fully on target
        this.transitionDuration = 2.0; // seconds
        this.transitionTimer = 0;
        this.isTransitioning = false;

        this.container.label = 'WeatherController'

        // Store current and target effects
        this.currentEffect = null;
        this.targetEffect = null;

        // Shadow transition
        this.currentShadowConfig = { x: -25, y: 0, skew: -0.3, alpha: 0.15 };
        this.targetShadowConfig = { x: -25, y: 0, skew: -0.3, alpha: 0.15 };

        this.ambientOverlay = new Graphics();
        this.ambientOverlay.blendMode = 'multiply';
        this.ambientOverlay.zIndex = 1100; // above vfxLayer at 1200? set just below it
        this.world.sortableChildren = true;
        this.world.addChild(this.ambientOverlay);
        this.currentAmbient = { color: 'black', alpha: 0 };
        this.targetAmbient = { color: 'black', alpha: 0 };
    }

    getAmbientForWeather(weatherType, intensity) {
        const ambients = {
            rain: { color: 'black', alpha: 0.5 * intensity },
            snow: { color: 0x1a2a4a, alpha: 0.55 * intensity },
            embers: { color: 0x262626, alpha: 0.5 * intensity },
            sandstorm: { color: 0x461f06, alpha: 0.5 * intensity },
            fog: { color: 0x88aaff, alpha: 0.5 * intensity },
            default: { color: 'black', alpha: 0.4 * intensity },
        };
        return ambients[weatherType] || ambients.default;
    }

    setWeather(type, intensity = 1, speed = 1, transitionTime = 2.0) {
        // ✅ FIX: Compare with targetWeatherType when transitioning
        console.log(`🌤️ Changing weather from ${this.currentWeatherType} to ${type}`);

        //audioManager.play('/sounds/bg-music.mp3')

        this.targetAmbient = this.getAmbientForWeather(type, intensity);

        // Start transition
        this.targetWeatherType = type;
        this.targetIntensity = intensity;
        this.targetSpeed = speed;
        this.transitionDuration = transitionTime;
        this.transitionTimer = 0;
        this.transitionProgress = 0;
        this.isTransitioning = true;

        // Create target effect
        if (this.targetEffect) {
            this.targetEffect.destroy();
            this.targetEffect = null;
        }

        this.targetEffect = this.createEffect(type, intensity, speed);

        // Set target shadow config based on new weather
        this.targetShadowConfig = this.getShadowConfigForWeather(type);

        // If no current effect, just set it immediately
        if (!this.currentEffect) {
            console.log('No current effect, setting new effect directly');
            this.currentEffect = this.targetEffect;
            this.currentWeatherType = this.targetWeatherType;
            this.currentShadowConfig = { ...this.targetShadowConfig };
            this.isTransitioning = false;
            this.targetEffect = null;
            this.transitionProgress = 1; // ADD THIS LINE
            this.transitionTimer = 0; // ADD THIS LINE
            this.updateAmbientOverlay(1);  // ✅ ADD THIS - update ambient immediately
            shadowManager.setDirection(this.targetShadowConfig);
            return; // ADD THIS - don't continue
        }
    }

    createEffect(type, intensity, speed) {
        switch (type) {
            case 'rain':
                return new RainEffect(this.app, this.container, intensity, speed);
            case 'snow':
                return new SnowEffect(this.app, this.container, intensity, speed);
            case 'embers':
                return new EmberEffect(this.app, this.container, intensity, speed);
            case 'sandstorm':
                return new SandstormEffect(this.app, this.container, intensity, speed);
            case 'fog':
                return new FogEffect(this.app, this.container, intensity);
            default:
                return null;
        }
    }

    getShadowConfigForWeather(weatherType) {
        const configs = {
            rain: { x: -25, y: 10, skew: -0.2, alpha: 0.1 },
            sandstorm: { x: -25, y: 10, skew: -0.2, alpha: 0.1 },
            snow: { x: -25, y: 10, skew: -0.2, alpha: 0.25 },
            embers: { x: -25, y: 10, skew: -0.2, alpha: 0.25 },
            fog: {x: -25, y: 10, skew: -0.2, alpha: 0.08 },
            default: { x: -25, y: 10, skew: -0.2, alpha: 0.15 }
        };
        return configs[weatherType] || configs.default;
    }

    finishTransition() {
        // Guard to prevent multiple calls
        if (!this.isTransitioning) return;

        // Clean up old effect
        if (this.currentEffect && this.currentEffect !== this.targetEffect) {
            this.currentEffect.destroy();
        }

        this.currentEffect = this.targetEffect;
        this.currentWeatherType = this.targetWeatherType;
        this.isTransitioning = false;
        this.transitionProgress = 1;

        // Apply final shadow config
        shadowManager.setDirection(this.targetShadowConfig);
        this.currentShadowConfig = { ...this.targetShadowConfig };
    }

    update(deltaTime) {
        // Clamp deltaTime
        const dt = Math.min(deltaTime, 0.033); // Cap at 33ms for smooth transitions

        // ADD THIS DEBUG LOG
        if (this.isTransitioning && Math.random() < 0.01) {
            console.log('Transition progress:', this.transitionProgress);
        }

        if (this.isTransitioning) {
            // Update transition timer
            this.transitionTimer += dt;
            this.transitionProgress = Math.min(1, this.transitionTimer / this.transitionDuration);

            // Easing function for smoother transition
            const easeProgress = this.easeInOutCubic(this.transitionProgress);

            // Update shadow with interpolated values
            const currentShadow = this.interpolateShadow(
                this.currentShadowConfig,
                this.targetShadowConfig,
                easeProgress
            );
            shadowManager.setDirection(currentShadow);

            // Update ambient overlay (handle this separately from particles)
            this.currentAmbient = this.interpolateAmbient(
                this.getAmbientForWeather(this.currentWeatherType, 1),
                this.targetAmbient,
                easeProgress
            );
            this.updateAmbientOverlay(1);

            // Update both effects with blend
            if (this.currentEffect && !this.currentEffect.destroyed) {
                this.currentEffect.update(dt, 1 - easeProgress);
            }

            if (this.targetEffect && !this.targetEffect.destroyed) {
                this.targetEffect.update(dt, easeProgress);
            }

            // Check if transition is complete
            if (this.transitionProgress >= 1 && this.isTransitioning) {
                this.finishTransition();
            }
        } else if (this.currentEffect) {
            // Normal update with full intensity
            this.currentEffect.update(dt, 1);
        }

        this.updateAmbientOverlay(1);
    }

    interpolateShadow(from, to, progress) {
        return {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
            skew: from.skew + (to.skew - from.skew) * progress,
            alpha: from.alpha + (to.alpha - from.alpha) * progress
        };
    }

    interpolateAmbient(from, to, progress) {
        // Interpolate RGB components separately for smooth color blending
        const fromColor = from.color;
        const toColor = to.color;

        const fromR = (fromColor >> 16) & 0xff;
        const fromG = (fromColor >> 8) & 0xff;
        const fromB = fromColor & 0xff;

        const toR = (toColor >> 16) & 0xff;
        const toG = (toColor >> 8) & 0xff;
        const toB = toColor & 0xff;

        const r = Math.floor(fromR + (toR - fromR) * progress);
        const g = Math.floor(fromG + (toG - fromG) * progress);
        const b = Math.floor(fromB + (toB - fromB) * progress);
        const blendedColor = (r << 16) | (g << 8) | b;

        return {
            color: blendedColor,
            alpha: from.alpha + (to.alpha - from.alpha) * progress
        };
    }

    updateAmbientOverlay(intensity = 1) {
        this.ambientOverlay.clear();

        if (this.currentAmbient.alpha > 0) {
            // Offset by world position to keep it screen-filling
            const x = -this.world.x / this.world.scale.x;
            const y = -this.world.y / this.world.scale.y;
            const w = this.app.screen.width / this.world.scale.x;
            const h = this.app.screen.height / this.world.scale.y;

            this.ambientOverlay
                .rect(x, y, w, h)
                .fill({ color: this.currentAmbient.color, alpha: this.currentAmbient.alpha * intensity });

        }
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
        this.app.stage.removeChild(this.container);
        this.container.destroy();
    }
}

// Base effect class with alpha blending support
class BaseWeatherEffect {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    update(deltaTime, intensity) {
        // Override in child classes
    }

    destroy() {
        this.graphics.destroy();
    }
}

/* ---------------------------
   UPDATED EMBER EFFECT WITH BLENDING
---------------------------- */
class EmberEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.baseIntensity = intensity;
        this.speed = speed;
        this.particles = [];
        this.screenWidth = app.screen.width;
        this.screenHeight = app.screen.height;
        this.destroyed = false;
        this.createParticles();
    }

    createParticles() {
        const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xff3300];
        const particleCount = Math.floor(300 * this.baseIntensity);

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.screenWidth,
                y: Math.random() * this.screenHeight,
                vx: (Math.random() - 0.5) * 120 * this.speed,
                vy: (-50 - Math.random() * 150) * this.speed,
                size: 2 + Math.random() * 1,
                alpha: 0.4 + Math.random() * 0.6,
                color: colors[Math.floor(Math.random() * colors.length)],
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.04,
                life: 0.5 + Math.random() * 0.5,
                fade: 0.003 + Math.random() * 0.007
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;

        this.graphics.clear();
        const dt = Math.min(deltaTime, 2.0);

        // Apply intensity multiplier for transitions
        const alphaMultiplier = intensity;

        // Update screen dimensions
        if (this.screenWidth !== this.app.screen.width || this.screenHeight !== this.app.screen.height) {
            this.screenWidth = this.app.screen.width;
            this.screenHeight = this.app.screen.height;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.wobble += p.wobbleSpeed * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.fade * dt;

            const flicker = 0.6 + Math.sin(Date.now() * 0.008 * p.size) * 0.4;
            const finalAlpha = Math.min(0.8, p.life * flicker) * alphaMultiplier;

            if (p.life <= 0 || p.y < -50 || p.y > this.screenHeight + 50 ||
                p.x < -50 || p.x > this.screenWidth + 50) {

                this.resetParticle(p);
                continue;
            }

            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: p.color, alpha: finalAlpha });

            this.graphics.circle(p.x, p.y, p.size * 0.6)
                .fill({ color: 0xffaa66, alpha: finalAlpha * 0.7 });

            if (p.vy < 0) {
                this.graphics.circle(p.x - p.vx * 2, p.y - p.vy * 2, p.size * 0.5)
                    .fill({ color: p.color, alpha: finalAlpha * 0.3 });
            }
        }
    }

    resetParticle(p) {
        p.x = Math.random() * this.screenWidth;
        p.y = Math.random() * this.screenHeight;
        p.vx = (Math.random() - 0.5) * 1.2 * this.speed;
        p.vy = (-0.5 - Math.random() * 1.5) * this.speed;
        p.life = 0.5 + Math.random() * 0.5;
    }

    destroy() {
        this.destroyed = true;
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}

/* ---------------------------
   UPDATED RAIN EFFECT WITH BLENDING
---------------------------- */
class RainEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.particles = [];
        this.destroyed = false;
        this.count = Math.floor(300 * intensity);
        this.create();
    }

    create() {
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * this.app.screen.width,
                y: Math.random() * this.app.screen.height,
                speed: (8 + Math.random() * 10) * 60 * this.speed,
                length: 10 + Math.random() * 15,
                alpha: 0.3 + Math.random() * 0.4,
                width: 1 + Math.random()
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;

        this.graphics.clear();
        const dt = Math.min(deltaTime, 2.0);

        const alphaMultiplier = intensity;

        for (const p of this.particles) {
            p.y += p.speed * dt;

            if (p.y > this.app.screen.height) {
                p.y = 0;
                p.x = Math.random() * this.app.screen.width;
            }

            this.graphics
                .moveTo(p.x, p.y)
                .lineTo(p.x, p.y + p.length)
                .stroke({
                    width: p.width,
                    color: 0xaaccff,
                    alpha: p.alpha * alphaMultiplier
                });
        }
    }

    destroy() {
        this.destroyed = true;
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}

/* ---------------------------
   UPDATED SNOW EFFECT WITH BLENDING
---------------------------- */
class SnowEffect extends BaseWeatherEffect {
    constructor(app, container, intensity, speed = 1) {
        super(app, container);
        this.speed = speed;
        this.particles = [];
        this.count = Math.floor(200 * intensity);
        this.destroyed = false;
        this.create();
    }

    create() {
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * this.app.screen.width,
                y: Math.random() * this.app.screen.height,
                vy: (60 + Math.random() * 120) * this.speed,
                vx: (Math.random() - 0.5) * 40 * this.speed,
                size: 2 + Math.random() * 3,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.04
            });
        }
    }

    update(deltaTime, intensity = 1) {
        if (this.destroyed) return;

        this.graphics.clear();
        const dt = Math.min(deltaTime, 2.0);

        const alphaMultiplier = intensity;

        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.wobble += p.wobbleSpeed * dt;

            if (p.y > this.app.screen.height) {
                p.y = 0;
                p.x = Math.random() * this.app.screen.width;
            }
            if (p.x > this.app.screen.width) p.x = 0;
            if (p.x < 0) p.x = this.app.screen.width;

            this.graphics.circle(
                p.x + Math.sin(p.wobble) * 5,
                p.y,
                p.size
            ).fill({ color: 0xffffff, alpha: 0.8 * alphaMultiplier });
        }
    }

    destroy() {
        this.destroyed = true;
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}


/* ---------------------------
   SANDSTORM - FIXED FOR dt
---------------------------- */
class SandstormEffect {
    constructor(app, container, intensity, speed = 1) {
        this.app = app;
        this.container = container;
        this.speed = speed;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.particles = [];
        this.count = Math.floor(400 * intensity);
        this.destroyed = false;
        this.create();
    }

    create() {
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * this.app.screen.width,
                y: Math.random() * this.app.screen.height,
                vx: (80 + Math.random() * 160) * this.speed,
                size: 1 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.3
            });
        }
    }

    update(deltaTime) {
        if (this.destroyed) return;

        this.graphics.clear();
        const dt = Math.min(deltaTime, 2.0);

        for (const p of this.particles) {
            p.x += p.vx * dt;

            if (p.x > this.app.screen.width) {
                p.x = 0;
                p.y = Math.random() * this.app.screen.height;
            }

            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: 0xccaa77, alpha: p.alpha });
        }
    }

    destroy() {
        this.destroyed = true;
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}

/* ---------------------------
   FOG - FIXED
---------------------------- */
class FogEffect {
    constructor(app, container, intensity) {
        this.app = app;
        this.container = container;
        this.intensity = intensity;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.destroyed = false;
    }

    update(deltaTime) {
        if (this.destroyed) return;
        // Fog doesn't need deltaTime for animation
        this.graphics.clear();
    }

    destroy() {
        this.destroyed = true;
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}

// Update function for your game loop
function updateWeather(weatherSystem, deltaTime, camX, camY, openWorld) {
    if (!weatherSystem.currentWeather) return;

    const bounds = openWorld.getCurrentBounds();
    // Pass raw deltaTime to weather system
    weatherSystem.update(deltaTime);
}