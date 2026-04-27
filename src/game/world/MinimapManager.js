// MinimapManager.js
import { Container, Graphics } from 'pixi.js';
import * as PIXI from 'pixi.js';

export class MinimapManager {
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
            elite: 0xff6666,
            boss: 0xff0000,
            drop: 0xffd700,
            poi: 0x00ff00
        };

        // Performance optimization
        this.lastUpdateFrame = 0;
        this.updateInterval = 2; // Update every 2 frames for smoothness
        this.frameCount = 0;

        // Display limits - show closest entities
        this.maxMobsToShow = 30;
        this.maxDropsToShow = 20;
        this.maxBossesToShow = 5;
        this.maxPOIsToShow = 10;

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

        // Distance indicator text
        this.distanceText = new PIXI.Text('', {
            fontSize: 10,
            fill: 0xaaaaaa,
            fontWeight: 'normal'
        });
        this.distanceText.anchor.set(0.5);
        this.distanceText.y = this.radius - 12;
        this.container.addChild(this.distanceText);
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
                clamped: true,
                distance: Math.hypot(worldX - this.playerRef.x, worldZ - this.playerRef.y)
            };
        }
        return { x: dx, y: dz, clamped: false, distance: dist / this.scale };
    }

    update() {
        if (!this.visible) return;

        if (!this.playerRef || this.playerRef.x == null || this.playerRef.y == null) {
            return;
        }
        
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

        // Collect and sort entities by distance
        const entitiesToDraw = [];

        // Process mobs - calculate distance and filter
        if (this.entities.mobs && this.entities.mobs.length > 0) {
            for (const mob of this.entities.mobs) {
                if (!mob || !mob.c || !mob.c.parent || !mob.c.visible) continue;
                if (mob.x == null || mob.y == null) continue;

                const distance = Math.hypot(mob.x - this.playerRef.x, mob.y - this.playerRef.y);
                const pos = this.worldToMinimap(mob.x, mob.y);

                entitiesToDraw.push({
                    type: 'mob',
                    entity: mob,
                    pos: pos,
                    distance: distance,
                    priority: mob.type === 'elite' ? 0 : 1 // Elite mobs get higher priority
                });
            }
        }

        // Process bosses
        if (this.entities.bosses && this.entities.bosses.length > 0) {
            for (const boss of this.entities.bosses) {
                if (!boss || !boss.c || !boss.c.parent || boss.dead) continue;
                if (boss.x == null || boss.y == null) continue;

                const distance = Math.hypot(boss.x - this.playerRef.x, boss.y - this.playerRef.y);
                const pos = this.worldToMinimap(boss.x, boss.y);

                entitiesToDraw.push({
                    type: 'boss',
                    entity: boss,
                    pos: pos,
                    distance: distance,
                    priority: 0 // Bosses have highest priority
                });
            }
        }

        // Process drops
        if (this.entities.drops && this.entities.drops.length > 0) {
            for (const drop of this.entities.drops) {
                if (!drop || !drop.container || !drop.container.parent || !drop.container.visible) continue;
                if (drop.container.x == null || drop.container.y == null) continue;

                const distance = Math.hypot(drop.container.x - this.playerRef.x, drop.container.y - this.playerRef.y);
                const pos = this.worldToMinimap(drop.container.x, drop.container.y);

                entitiesToDraw.push({
                    type: 'drop',
                    entity: drop,
                    pos: pos,
                    distance: distance,
                    priority: 2 // Drops have lower priority
                });
            }
        }

        // Sort by priority (lower number = higher priority) then by distance
        entitiesToDraw.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.distance - b.distance;
        });

        // Draw with limits
        let mobsDrawn = 0;
        let bossesDrawn = 0;
        let dropsDrawn = 0;

        for (const item of entitiesToDraw) {
            // Check limits
            if (item.type === 'mob' && mobsDrawn >= this.maxMobsToShow) continue;
            if (item.type === 'boss' && bossesDrawn >= this.maxBossesToShow) continue;
            if (item.type === 'drop' && dropsDrawn >= this.maxDropsToShow) continue;

            // Skip if outside minimap bounds (but still count toward limit if we processed it)
            if (Math.abs(item.pos.x) > this.radius + 10 || Math.abs(item.pos.y) > this.radius + 10) continue;

            const g = new Graphics();

            switch(item.type) {
                case 'mob':
                    const isElite = item.entity.type === 'elite';
                    g.circle(0, 0, isElite ? 4 : 3).fill({ color: this.colors.mob });
                    if (isElite) {
                        g.circle(0, 0, 6).fill({ color: this.colors.elite, alpha: 0.3 });
                    }
                    mobsDrawn++;
                    break;

                case 'boss':
                    g.circle(0, 0, 6).fill({ color: this.colors.boss });
                    g.circle(0, 0, 9).fill({ color: this.colors.boss, alpha: 0.3 });
                    bossesDrawn++;
                    break;

                case 'drop':
                    g.circle(0, 0, 2).fill({ color: this.colors.drop });
                    dropsDrawn++;
                    break;
            }

            g.x = item.pos.x;
            g.y = item.pos.y;
            this.entityLayer.addChild(g);
        }

        // Draw POIs separately (always show closest)
        if (this.openWorld.spawnedPOIs && this.openWorld.spawnedPOIs.size > 0) {
            const pois = [];
            for (const [key, poi] of this.openWorld.spawnedPOIs) {
                if (poi.x == null || poi.z == null) continue;

                const distance = Math.hypot(poi.x - this.playerRef.x, poi.z - this.playerRef.y);
                const pos = this.worldToMinimap(poi.x, poi.z);

                pois.push({
                    poi: poi,
                    pos: pos,
                    distance: distance,
                    type: poi.type
                });
            }

            // Sort by distance
            pois.sort((a, b) => a.distance - b.distance);

            let poisDrawn = 0;
            for (const item of pois) {
                if (poisDrawn >= this.maxPOIsToShow) break;
                if (Math.abs(item.pos.x) > this.radius + 10 || Math.abs(item.pos.y) > this.radius + 10) continue;

                const g = new Graphics();
                const color = item.type === 'boss' ? 0xff0000 :
                    item.type === 'loot' ? 0xffaa44 : 0x44ff44;
                g.circle(0, 0, 4).fill({ color });
                g.circle(0, 0, 7).fill({ color, alpha: 0.2 });
                g.x = item.pos.x;
                g.y = item.pos.y;
                this.entityLayer.addChild(g);
                poisDrawn++;
            }
        }

        // Update distance indicator text
        this.updateDistanceIndicator(entitiesToDraw);
    }

    updateDistanceIndicator(entities) {
        if (!this.distanceText) return;

        // Find closest enemy (mob or boss)
        let closestDistance = Infinity;
        for (const item of entities) {
            if ((item.type === 'mob' || item.type === 'boss') && item.distance < closestDistance) {
                closestDistance = item.distance;
            }
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