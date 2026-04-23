import { Graphics, Container, Sprite, Texture } from 'pixi.js';

export class WeatherSystem {
    constructor(world, app) {
        this.world = world;
        this.app = app;
        this.container = new Container();
        this.world.addChild(this.container);

        this.currentWeather = null;
        this.particles = [];
        this.lastTimestamp = 0;
    }

    setWeather(type, intensity = 1) {
        console.log(`Setting weather: ${type} with intensity ${intensity}`); // Debug

        // Clear existing weather
        this.clear();

        switch(type) {
            case 'rain':
                this.currentWeather = new RainEffect(this.world, this.container, intensity);
                break;
            case 'snow':
                this.currentWeather = new SnowEffect(this.world, this.container, intensity);
                break;
            case 'embers':
                this.currentWeather = new EmberEffect(this.world, this.container, intensity);
                break;
            case 'sandstorm':
                this.currentWeather = new SandstormEffect(this.world, this.container, intensity);
                break;
            case 'fog':
                this.currentWeather = new FogEffect(this.world, this.container, intensity);
                break;
            default:
                this.currentWeather = null;
        }
    }

    update(deltaTime, cameraX, cameraY, bounds) {
        if (this.currentWeather) {
            this.currentWeather.update(deltaTime, cameraX, cameraY, bounds);
        }
    }

    clear() {
        if (this.currentWeather) {
            this.currentWeather.destroy();
            this.currentWeather = null;
        }
        this.container.removeChildren();
        this.particles = [];
    }

    destroy() {
        this.clear();
        this.world.removeChild(this.container);
        this.container.destroy();
    }
}

// Base Particle Class
class WeatherParticle {
    constructor(x, y, speedX, speedY, size, alpha, color) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.size = size;
        this.alpha = alpha;
        this.color = color;
        this.active = true;
    }
}

// Rain Effect
class RainEffect {
    constructor(world, container, intensity) {
        this.world = world;
        this.container = container;
        this.intensity = intensity;
        this.particles = [];
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.particleCount = Math.floor(300 * intensity);
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                length: 10 + Math.random() * 15,
                speed: 15 + Math.random() * 10,
                alpha: 0.3 + Math.random() * 0.4,
                width: 1 + Math.random()
            });
        }
    }

    update(deltaTime, cameraX, cameraY, bounds) {
        this.graphics.clear();

        const screenWidth = this.world.width || 2000;
        const screenHeight = this.world.height || 2000;

        for (const p of this.particles) {
            p.y += p.speed * deltaTime;

            // Reset when off screen
            if (p.y > screenHeight / 2 + 500) {
                p.y = -screenHeight / 2 - 500;
                p.x = (Math.random() - 0.5) * screenWidth;
            }

            // Draw rain drop
            this.graphics.moveTo(p.x + cameraX, p.y + cameraY);
            this.graphics.lineTo(p.x + cameraX, p.y + cameraY + p.length);
            this.graphics.stroke({
                width: p.width,
                color: 0xaaccff,
                alpha: p.alpha * 0.6
            });
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}

// Snow Effect
class SnowEffect {
    constructor(world, container, intensity) {
        this.world = world;
        this.container = container;
        this.intensity = intensity;
        this.particles = [];
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.particleCount = Math.floor(200 * intensity);
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                size: 2 + Math.random() * 4,
                speedX: (Math.random() - 0.5) * 20,
                speedY: 5 + Math.random() * 8,
                alpha: 0.5 + Math.random() * 0.5,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.03
            });
        }
    }

    update(deltaTime, cameraX, cameraY, bounds) {
        this.graphics.clear();

        for (const p of this.particles) {
            p.x += p.speedX * deltaTime;
            p.y += p.speedY * deltaTime;
            p.wobble += p.wobbleSpeed * deltaTime;

            // Add wobble movement
            const wobbleX = Math.sin(p.wobble) * 10;

            // Reset when off screen
            if (p.y > 1000 || p.x > 1000 || p.x < -1000) {
                p.y = -800;
                p.x = (Math.random() - 0.5) * 1600;
            }

            // Draw snowflake
            this.graphics.circle(p.x + cameraX + wobbleX, p.y + cameraY, p.size)
                .fill({ color: 0xffffff, alpha: p.alpha });
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}

// Ember Effect (for lava biome)
class EmberEffect {
    constructor(world, container, intensity, speed = 0.2) {
        this.world = world;
        this.container = container;
        this.intensity = intensity;
        this.speed = speed;  // Add speed parameter
        this.particles = [];
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.particleCount = Math.floor(150 * intensity);
        this.createParticles();
    }

    createParticles() {
        const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00];

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 1000 - 500,
                size: 1 + Math.random() ,
                speedX: ((Math.random() - 0.5) * 30) * this.speed,  // Multiply by speed
                speedY: (-10 - Math.random() * 20) * this.speed,    // Multiply by speed
                alpha: 0.6 + Math.random() * 0.4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                fadeSpeed: (0.01 + Math.random() * 0.02) * this.speed  // Multiply by speed
            });
        }
    }

    update(deltaTime, cameraX, cameraY, bounds) {
        this.graphics.clear();

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX * deltaTime;
            p.y += p.speedY * deltaTime;
            p.life -= p.fadeSpeed * deltaTime;
            p.alpha = p.life * 0.8;

            // Reset or remove dead particles
            if (p.life <= 0 || p.y < -600) {
                this.particles.splice(i, 1);
                // Create new ember
                this.particles.push({
                    x: (Math.random() - 0.5) * 1800,
                    y: 800,
                    size: 1 + Math.random() ,
                    speedX: ((Math.random() - 0.5) * 40) * this.speed,     // Multiply by speed
                    speedY: (-15 - Math.random() * 25) * this.speed,       // Multiply by speed
                    alpha: 0.6,
                    color: p.color,
                    life: 1,
                    fadeSpeed: (0.008 + Math.random() * 0.015) * this.speed // Multiply by speed
                });
                continue;
            }

            // Draw ember with glow
            this.graphics.circle(p.x + cameraX, p.y + cameraY, p.size)
                .fill({ color: p.color, alpha: p.alpha });

            // Inner glow
            this.graphics.circle(p.x + cameraX, p.y + cameraY, p.size * 0.6)
                .fill({ color: 0xffcc66, alpha: p.alpha * 0.8 });
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}

// Fog Effect
class FogEffect {
    constructor(world, container, intensity) {
        this.world = world;
        this.container = container;
        this.intensity = intensity;
        this.layers = [];
        this.createLayers();
    }

    createLayers() {
        // Create multiple fog layers
        for (let i = 0; i < 3; i++) {
            const graphics = new Graphics();
            this.container.addChild(graphics);
            this.layers.push({
                graphics,
                offsetX: Math.random() * 1000,
                offsetY: Math.random() * 1000,
                speed: 0.1 + i * 0.05,
                alpha: 0.1 + (i * 0.05) * this.intensity,
                scale: 1 + i * 0.5
            });
        }
    }

    update(deltaTime, cameraX, cameraY, bounds) {
        for (const layer of this.layers) {
            layer.offsetX += layer.speed * deltaTime;
            layer.offsetY += layer.speed * 0.3 * deltaTime;

            layer.graphics.clear();

            // Create noise-based fog pattern
            for (let i = 0; i < 20; i++) {
                const angle = i * Math.PI * 2 / 20;
                const radius = 300 + Math.sin(layer.offsetX * 0.001 + i) * 100;
                const x = Math.cos(angle + layer.offsetX * 0.002) * radius;
                const y = Math.sin(angle * 0.7 + layer.offsetY * 0.002) * radius * 0.6;

                layer.graphics.circle(x + cameraX, y + cameraY, 50 + Math.sin(layer.offsetX + i) * 20)
                    .fill({ color: 0x88aaff, alpha: layer.alpha * 0.3 });
            }
        }
    }

    destroy() {
        for (const layer of this.layers) {
            layer.graphics.destroy();
        }
    }
}

// Sandstorm Effect
class SandstormEffect {
    constructor(world, container, intensity) {
        this.world = world;
        this.container = container;
        this.intensity = intensity;
        this.particles = [];
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.particleCount = Math.floor(400 * intensity);
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                size: 1 + Math.random() * 3,
                speedX: 30 + Math.random() * 40,
                speedY: (Math.random() - 0.5) * 20,
                alpha: 0.2 + Math.random() * 0.4,
                color: 0xccaa77
            });
        }
    }

    update(deltaTime, cameraX, cameraY, bounds) {
        this.graphics.clear();

        // Add tint overlay for sandstorm effect
        this.graphics.rect(cameraX - 1000, cameraY - 800, 2000, 1600)
            .fill({ color: 0xaa8844, alpha: 0.1 * this.intensity });

        for (const p of this.particles) {
            p.x += p.speedX * deltaTime;
            p.y += p.speedY * deltaTime;

            // Reset when off screen
            if (p.x > 1200) {
                p.x = -1200;
                p.y = (Math.random() - 0.5) * 1600;
            }
            if (p.x < -1200) {
                p.x = 1200;
                p.y = (Math.random() - 0.5) * 1600;
            }

            // Draw sand particle
            this.graphics.circle(p.x + cameraX, p.y + cameraY, p.size)
                .fill({ color: p.color, alpha: p.alpha });
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}