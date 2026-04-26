import { Graphics, Container } from 'pixi.js';

export class CreateWeatherController {
    constructor(app) {
        this.app = app;
        this.container = new Container();

        this.container.zIndex = 999;
        this.app.stage.addChild(this.container);

        this.app.stage.sortableChildren = true;
    }

    setWeather(type, intensity = 1, speed = 1) {
        this.clear();

        switch (type) {
            case 'rain':
                this.currentWeather = new RainEffect(this.app, this.container, intensity, speed);
                break;
            case 'snow':
                this.currentWeather = new SnowEffect(this.app, this.container, intensity, speed);
                break;
            case 'embers':
                this.currentWeather = new EmberEffect(this.app, this.container, intensity, speed);
                break;
            case 'sandstorm':
                this.currentWeather = new SandstormEffect(this.app, this.container, intensity, speed);
                break;
            case 'fog':
                this.currentWeather = new FogEffect(this.app, this.container, intensity);
                break;
            default:
                this.currentWeather = null;
        }
    }

    update(deltaTime) {
        if (this.currentWeather) {
            this.currentWeather.update(deltaTime);
        }
    }

    clear() {
        if (this.currentWeather) {
            this.currentWeather.destroy();
            this.currentWeather = null;
        }
        this.container.removeChildren();
    }

    destroy() {
        this.clear();
        this.stage.removeChild(this.container);
        this.container.destroy();
    }
}

/* ---------------------------
   EMBER EFFECT (LAVA) - FIXED FOR dt
---------------------------- */
class EmberEffect {
    constructor(app, container, intensity, speed = 1) {
        this.app = app;
        this.container = container;
        this.speed = speed;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.particles = [];
        this.particleCount = Math.floor(300 * intensity);
        this.screenWidth = app.screen.width;
        this.screenHeight = app.screen.height;
        this.createParticles();
    }

    createParticles() {
        const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xff3300];

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.screenWidth,
                y: Math.random() * this.screenHeight,
                vx: (Math.random() - 0.5) * 120 * this.speed,
                vy: (-50 - Math.random() * 150) * this.speed,
                size: 2 + Math.random() * 4,
                alpha: 0.4 + Math.random() * 0.6,
                color: colors[Math.floor(Math.random() * colors.length)],
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.04,
                life: 0.5 + Math.random() * 0.5,
                fade: 0.003 + Math.random() * 0.007
            });
        }
    }

    update(deltaTime) {
        this.graphics.clear();

        // Clamp deltaTime to prevent huge jumps
        const dt = Math.min(deltaTime, 2.0);

        // Update screen dimensions
        if (this.screenWidth !== this.app.screen.width || this.screenHeight !== this.app.screen.height) {
            this.screenWidth = this.app.screen.width;
            this.screenHeight = this.app.screen.height;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update position with deltaTime
            p.wobble += p.wobbleSpeed * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.fade * dt;

            // Flicker effect (use time-based, not dt-dependent for visual effect)
            const flicker = 0.6 + Math.sin(Date.now() * 0.008 * p.size) * 0.4;
            p.alpha = Math.min(0.8, p.life * flicker);

            // Reset particle when off screen or dead
            if (p.life <= 0 || p.y < -50 || p.y > this.screenHeight + 50 ||
                p.x < -50 || p.x > this.screenWidth + 50) {

                this.particles[i] = {
                    x: Math.random() * this.screenWidth,
                    y: Math.random() * this.screenHeight,
                    vx: (Math.random() - 0.5) * 1.2 * this.speed,
                    vy: (-0.5 - Math.random() * 1.5) * this.speed,
                    size: 1 + Math.random(),
                    alpha: 0.4,
                    color: p.color,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpeed: 0.02 + Math.random() * 0.04,
                    life: 0.5 + Math.random() * 0.5,
                    fade: 0.003 + Math.random() * 0.007
                };
                continue;
            }

            // Draw ember
            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: p.color, alpha: p.alpha });

            // Inner glow
            this.graphics.circle(p.x, p.y, p.size * 0.6)
                .fill({ color: 0xffaa66, alpha: p.alpha * 0.7 });

            // Trail effect
            if (p.vy < 0) {
                this.graphics.circle(p.x - p.vx * 2, p.y - p.vy * 2, p.size * 0.5)
                    .fill({ color: p.color, alpha: p.alpha * 0.3 });
            }
        }

        // Add ambient glow overlay for lava biome
        this.graphics.rect(0, 0, this.screenWidth, this.screenHeight)
            .fill({ color: "#262626", alpha: 0.5 });
    }

    destroy() {
        this.graphics.destroy();
    }
}

/* ---------------------------
   RAIN - FIXED FOR dt
---------------------------- */
class RainEffect {
    constructor(app, container, intensity, speed = 1) {
        this.app = app;
        this.container = container;
        this.speed = speed;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.particles = [];
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

    update(deltaTime) {
        this.graphics.clear();
        const dt = Math.min(deltaTime, 2.0);

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
                    alpha: p.alpha
                });
        }

        this.graphics.rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: '#062646', alpha: 0.2 });
    }

    destroy() {
        this.graphics.destroy();
    }
}

/* ---------------------------
   SNOW - FIXED FOR dt
---------------------------- */
class SnowEffect {
    constructor(app, container, intensity, speed = 1) {
        this.app = app;
        this.container = container;
        this.speed = speed;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.particles = [];
        this.count = Math.floor(200 * intensity);
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

    update(deltaTime) {
        this.graphics.clear();
        const dt = Math.min(deltaTime, 2.0);

        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.wobble += p.wobbleSpeed * dt;

            if (p.y > this.app.screen.height) {
                p.y = 0;
                p.x = Math.random() * this.app.screen.width;
            }
            if (p.x > this.app.screen.width) {
                p.x = 0;
            }
            if (p.x < 0) {
                p.x = this.app.screen.width;
            }

            this.graphics.circle(
                p.x + Math.sin(p.wobble) * 5,
                p.y,
                p.size
            ).fill({ color: 0xffffff, alpha: 0.8 });
        }
    }

    destroy() {
        this.graphics.destroy();
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

        this.graphics.rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: '#461f06', alpha: 0.2 });
    }

    destroy() {
        this.graphics.destroy();
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
    }

    update(deltaTime) {
        // Fog doesn't need deltaTime for animation
        this.graphics.clear();
        this.graphics.rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: 0x88aaff, alpha: 0.05 * this.intensity });
    }

    destroy() {
        this.graphics.destroy();
    }
}

// Update function for your game loop
function updateWeather(weatherSystem, deltaTime, camX, camY, openWorld) {
    if (!weatherSystem.currentWeather) return;

    const bounds = openWorld.getCurrentBounds();
    // Pass raw deltaTime to weather system
    weatherSystem.update(deltaTime);
}