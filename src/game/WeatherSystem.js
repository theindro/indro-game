import { Graphics, Container } from 'pixi.js';

export class WeatherSystem {
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
        this.particleCount = Math.floor(150 * intensity);

        this.createParticles();
    }

    createParticles() {
        const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00];

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.app.screen.width,
                y: Math.random() * this.app.screen.height,
                vx: (Math.random() - 0.5) * 1.5 * this.speed,
                vy: (-1 - Math.random()) * this.speed,
                size: 1 + Math.random(),
                alpha: 0.6 + Math.random() * 0.4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                fade: 0.01 + Math.random() * 0.02
            });
        }
    }

    update(deltaTime) {
        this.graphics.clear();

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= p.fade * deltaTime;

            p.alpha = p.life * 0.8;

            if (p.life <= 0 || p.y < 0) {
                this.particles.splice(i, 1);

                this.particles.push({
                    x: Math.random() * this.app.screen.width,
                    y: this.app.screen.height,
                    vx: (Math.random() - 0.5) * 2 * this.speed,
                    vy: (-1 - Math.random() * 2) * this.speed,
                    size: 1 + Math.random(),
                    alpha: 0.6,
                    color: p.color,
                    life: 1,
                    fade: 0.01 + Math.random() * 0.02
                });

                continue;
            }

            // DRAW (screen space)
            this.graphics.circle(p.x, p.y, p.size)
                .fill({ color: p.color, alpha: p.alpha });
        }
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