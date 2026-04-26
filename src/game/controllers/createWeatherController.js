import { Graphics, Container } from 'pixi.js';

export class CreateWeatherController {
    constructor(stage, app) {
        this.stage = stage;
        this.app = app;

        this.container = new Container();
        this.stage.addChild(this.container);

        this.currentWeather = null;
        this.lastTimestamp = 0;
    }

    setWeather(type, intensity = 1, speed = 1) {
        this.clear();

        switch (type) {
            case 'rain':
                this.currentWeather = new RainEffect(this.app, this.container, intensity);
                break;

            case 'snow':
                this.currentWeather = new SnowEffect(this.app, this.container, intensity);
                break;

            case 'embers':
                this.currentWeather = new EmberEffect(this.app, this.container, intensity, speed);
                break;

            case 'sandstorm':
                this.currentWeather = new SandstormEffect(this.app, this.container, intensity);
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
   BASE PARTICLE STRUCT
---------------------------- */
class WeatherParticle {
    constructor(x, y, vx, vy, size, alpha, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.alpha = alpha;
        this.color = color;
    }
}

/* ---------------------------
   EMBER EFFECT (LAVA)
---------------------------- */
class EmberEffect {
    constructor(app, container, intensity, speed = 1) {
        this.app = app;
        this.container = container;
        this.speed = speed;

        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.particles = [];
        // Use higher intensity for better coverage
        this.particleCount = Math.floor(300 * intensity);

        this.createParticles();

        // Store screen dimensions for resize handling
        this.screenWidth = app.screen.width;
        this.screenHeight = app.screen.height;
    }

    createParticles() {
        const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xff3300];

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                // Spread across ENTIRE screen width and height
                x: Math.random() * this.screenWidth,
                y: Math.random() * this.screenHeight, // KEY FIX: Random Y across full screen
                vx: (Math.random() - 0.5) * 1.2 * this.speed,
                vy: (-0.5 - Math.random() * 1.5) * this.speed,
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

        // Update screen dimensions in case of resize
        if (this.screenWidth !== this.app.screen.width || this.screenHeight !== this.app.screen.height) {
            this.screenWidth = this.app.screen.width;
            this.screenHeight = this.app.screen.height;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update position
            p.wobble += p.wobbleSpeed * deltaTime;
            p.x += (p.vx + Math.sin(p.wobble) * 0.3) * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= p.fade * deltaTime;

            // Flicker effect
            const flicker = 0.6 + Math.sin(Date.now() * 0.008 * p.size) * 0.4;
            p.alpha = Math.min(0.8, p.life * flicker);

            // Reset particle when it goes off screen OR dies
            if (p.life <= 0 || p.y < -50 || p.y > this.screenHeight + 50 ||
                p.x < -50 || p.x > this.screenWidth + 50) {

                // Respawn at random position across FULL screen
                this.particles[i] = {
                    x: Math.random() * this.screenWidth,
                    y: Math.random() * this.screenHeight, // KEY FIX: Respawn anywhere
                    vx: (Math.random() - 0.5) * 1.2 * this.speed,
                    vy: (-0.5 - Math.random() * 1.5) * this.speed,
                    size: 1 + Math.random() ,
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

            // Trail effect (optional)
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
   RAIN
---------------------------- */
class RainEffect {
    constructor(app, container, intensity) {
        this.app = app;
        this.container = container;

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
                speed: 8 + Math.random() * 10,
                length: 10 + Math.random() * 15,
                alpha: 0.3 + Math.random() * 0.4,
                width: 1 + Math.random()
            });
        }
    }

    update(deltaTime) {
        this.graphics.clear();

        for (const p of this.particles) {
            p.y += p.speed * deltaTime;

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
   SNOW
---------------------------- */
class SnowEffect {
    constructor(app, container, intensity) {
        this.app = app;
        this.container = container;

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
                vx: (Math.random() - 0.5) * 1,
                vy: 1 + Math.random() * 2,
                size: 2 + Math.random() * 3,
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    update(deltaTime) {
        this.graphics.clear();

        for (const p of this.particles) {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.wobble += 0.02;

            if (p.y > this.app.screen.height) {
                p.y = 0;
                p.x = Math.random() * this.app.screen.width;
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
   SANDSTORM
---------------------------- */
class SandstormEffect {
    constructor(app, container, intensity) {
        this.app = app;
        this.container = container;

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
                vx: 2 + Math.random() * 3,
                size: 1 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.3
            });
        }
    }

    update(deltaTime) {
        this.graphics.clear();

        for (const p of this.particles) {
            p.x += p.vx * deltaTime;

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
   FOG (simple)
---------------------------- */
class FogEffect {
    constructor(app, container, intensity) {
        this.app = app;
        this.container = container;

        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.intensity = intensity;
    }

    update() {
        this.graphics.clear();

        this.graphics.rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: 0x88aaff, alpha: 0.05 * this.intensity });
    }

    destroy() {
        this.graphics.destroy();
    }
}