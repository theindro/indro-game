// minimap.js
import { Container, Graphics } from 'pixi.js';
import * as PIXI from 'pixi.js';

export class Minimap {
    constructor(app, openWorld, playerRef, entities) {
        this.app = app;
        this.openWorld = openWorld;
        this.playerRef = playerRef;
        this.entities = entities;

        this.radius = 120;
        this.scale = 0.05;
        this.centerX = app.screen.width - this.radius - 20;
        this.centerY = this.radius + 20;

        this.colors = {
            background: 0x000000,
            border: 0x444444,
            player: 0x44ff88,
            playerGlow: 0x88ffaa,
            mob: 0xff4466,
            boss: 0xff0000,
            drop: 0xffd700,
            poi: 0x00ff00
        };

        // Cached graphics objects (reuse instead of recreate each frame)
        this.cachedEntities = new Map();
        this.lastUpdateFrame = 0;
        this.updateInterval = 3; // Update every 3 frames for performance
        this.frameCount = 0;

        // Limits
        this.maxMobs = 50;
        this.maxDrops = 20;

        this.createContainer();
        this.createBackground();
        this.createBorder();
        this.createPlayerIndicator();

        this.visible = true;
        this.toggleKey = 'm';
        this.setupKeyboardToggle();

        // Bind resize handler
        this.resizeHandler = () => this.resize(app.screen.width, app.screen.height);
        window.addEventListener('resize', this.resizeHandler);
    }

    createContainer() {
        this.container = new Container();
        this.container.x = this.centerX;
        this.container.y = this.centerY;
        this.app.stage.addChild(this.container);

        // Create mask circle
        this.mask = new Graphics();
        this.mask.circle(0, 0, this.radius).fill(0xffffff);
        this.container.addChild(this.mask);

        // Apply mask to container
        this.container.mask = this.mask;

        // Layers (add after mask so they get masked)
        this.mapBackground = new Container();
        this.entityLayer = new Container();

        this.container.addChild(this.mapBackground);
        this.container.addChild(this.entityLayer);
    }

    createBackground() {
        // Background circle (static, only created once)
        this.background = new Graphics();
        this.background.circle(0, 0, this.radius)
            .fill({ color: this.colors.background, alpha: 0.85 });
        this.background.circle(0, 0, this.radius)
            .stroke({ color: this.colors.border, width: 2, alpha: 0.8 });
        this.mapBackground.addChild(this.background);

        // Grid lines (static)
        this.grid = new Graphics();
        const gridSpacing = 40;
        for (let i = -this.radius; i <= this.radius; i += gridSpacing) {
            if (i !== 0) {
                this.grid.moveTo(i, -this.radius).lineTo(i, this.radius)
                    .stroke({ color: 0x333333, width: 1, alpha: 0.2 });
                this.grid.moveTo(-this.radius, i).lineTo(this.radius, i)
                    .stroke({ color: 0x333333, width: 1, alpha: 0.2 });
            }
        }
        // Center lines
        this.grid.moveTo(0, -this.radius).lineTo(0, this.radius)
            .stroke({ color: 0x666666, width: 1, alpha: 0.4 });
        this.grid.moveTo(-this.radius, 0).lineTo(this.radius, 0)
            .stroke({ color: 0x666666, width: 1, alpha: 0.4 });
        this.mapBackground.addChild(this.grid);
    }

    createBorder() {
        this.border = new Graphics();
        this.border.circle(0, 0, this.radius + 2)
            .stroke({ color: 0x888888, width: 2, alpha: 0.8 });
        this.container.addChild(this.border);

        // Compass
        const northText = new PIXI.Text('N', {
            fontSize: 12,
            fill: 0xff8888,
            fontWeight: 'bold'
        });
        northText.anchor.set(0.5);
        northText.y = -this.radius + 8;
        this.container.addChild(northText);
    }

    createPlayerIndicator() {
        this.playerIndicator = new Container();

        this.playerDot = new Graphics();
        this.playerDot.circle(0, 0, 5).fill({ color: this.colors.player });
        this.playerDot.circle(0, 0, 8).fill({ color: this.colors.playerGlow, alpha: 0.3 });

        this.playerDirection = new Graphics();
        this.playerDirection.moveTo(0, -9)
            .lineTo(-3, 0)
            .lineTo(3, 0)
            .closePath()
            .fill({ color: this.colors.player });

        this.playerIndicator.addChild(this.playerDot);
        this.playerIndicator.addChild(this.playerDirection);
        this.playerIndicator.x = 0;
        this.playerIndicator.y = 0;
        this.entityLayer.addChild(this.playerIndicator);
    }

    worldToMinimap(worldX, worldZ) {
        const dx = (worldX - this.playerRef.x) * this.scale;
        const dz = (worldZ - this.playerRef.y) * this.scale;

        const dist = Math.hypot(dx, dz);
        if (dist > this.radius - 5) {
            const angle = Math.atan2(dz, dx);
            return {
                x: Math.cos(angle) * (this.radius - 10),
                y: Math.sin(angle) * (this.radius - 10),
                clamped: true
            };
        }
        return { x: dx, y: dz, clamped: false };
    }

    update() {
        if (!this.visible) return;

        // Throttle updates for performance
        this.frameCount++;
        if (this.frameCount % this.updateInterval !== 0) return;

        // Clear only the entity layer (keep background static)
        this.entityLayer.removeChildren();
        this.entityLayer.addChild(this.playerIndicator);

        // Update player direction
        if (this.playerRef.rotation !== undefined) {
            this.playerDirection.rotation = this.playerRef.rotation;
        }

        // Batch graphics creation (limit count)
        const graphicsBatch = [];

        // Draw mobs (with limit)
        if (this.entities.mobs && this.entities.mobs.length > 0) {
            const mobsToDraw = this.entities.mobs.slice(0, this.maxMobs);
            for (const mob of mobsToDraw) {
                if (!mob.c || !mob.c.visible) continue;

                const pos = this.worldToMinimap(mob.x, mob.y);
                if (Math.abs(pos.x) > this.radius || Math.abs(pos.y) > this.radius) continue;

                const g = new Graphics();
                const isElite = mob.type === 'elite';
                g.circle(0, 0, isElite ? 4 : 3).fill({ color: this.colors.mob });
                if (isElite) {
                    g.circle(0, 0, 6).fill({ color: this.colors.mob, alpha: 0.3 });
                }
                g.x = pos.x;
                g.y = pos.y;
                graphicsBatch.push(g);
            }
        }

        // Draw bosses
        if (this.entities.bosses && this.entities.bosses.length > 0) {
            for (const boss of this.entities.bosses) {
                if (!boss.c || !boss.c.visible || boss.dead) continue;

                const pos = this.worldToMinimap(boss.x, boss.y);
                if (Math.abs(pos.x) > this.radius || Math.abs(pos.y) > this.radius) continue;

                const g = new Graphics();
                g.circle(0, 0, 6).fill({ color: this.colors.boss });
                g.circle(0, 0, 9).fill({ color: this.colors.boss, alpha: 0.3 });
                g.x = pos.x;
                g.y = pos.y;
                graphicsBatch.push(g);
            }
        }

        // Draw drops (limited)
        if (this.entities.drops && this.entities.drops.length > 0 && this.entities.drops.length < 100) {
            const dropsToDraw = this.entities.drops.slice(0, this.maxDrops);
            for (const drop of dropsToDraw) {
                if (!drop.container || !drop.container.visible) continue;

                const pos = this.worldToMinimap(drop.container.x, drop.container.y);
                if (Math.abs(pos.x) > this.radius || Math.abs(pos.y) > this.radius) continue;

                const g = new Graphics();
                g.circle(0, 0, 2).fill({ color: this.colors.drop });
                g.x = pos.x;
                g.y = pos.y;
                graphicsBatch.push(g);
            }
        }

        // Draw POIs (limited)
        if (this.openWorld.spawnedPOIs && this.openWorld.spawnedPOIs.size > 0) {
            let poiCount = 0;
            for (const [key, poi] of this.openWorld.spawnedPOIs) {
                if (poiCount > 15) break; // Limit POIs
                if (!poi.x || !poi.z) continue;

                const pos = this.worldToMinimap(poi.x, poi.z);
                if (Math.abs(pos.x) > this.radius || Math.abs(pos.y) > this.radius) continue;

                const g = new Graphics();
                const color = poi.type === 'boss' ? 0xff0000 :
                    poi.type === 'loot' ? 0xffaa44 : 0x44ff44;
                g.circle(0, 0, 4).fill({ color });
                g.circle(0, 0, 7).fill({ color, alpha: 0.2 });
                g.x = pos.x;
                g.y = pos.y;
                graphicsBatch.push(g);
                poiCount++;
            }
        }

        // Add all graphics at once
        for (const g of graphicsBatch) {
            this.entityLayer.addChild(g);
        }
    }

    setupKeyboardToggle() {
        this.keydownHandler = (e) => {
            if (e.key === this.toggleKey || e.key === this.toggleKey.toUpperCase()) {
                this.toggle();
            }
        };
        window.addEventListener('keydown', this.keydownHandler);
    }

    toggle() {
        this.visible = !this.visible;
        this.container.visible = this.visible;
    }

    setVisible(visible) {
        this.visible = visible;
        this.container.visible = visible;
    }

    resize(width, height) {
        this.centerX = width - this.radius - 20;
        this.centerY = this.radius + 20;
        this.container.x = this.centerX;
        this.container.y = this.centerY;

        // Update mask position if needed
        if (this.mask) {
            this.mask.clear();
            this.mask.circle(0, 0, this.radius).fill(0xffffff);
        }
    }

    destroy() {
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('keydown', this.keydownHandler);
        this.container.destroy({ children: true });
    }
}