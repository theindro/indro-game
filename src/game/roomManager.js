import { Graphics } from 'pixi.js';
import { buildGround } from './ground.js';
import { scatterProps } from './props.js';
import { ROOMS, MOB_RADIUS, BOSS_RADIUS } from './constants.js';
import { spawnMob, updateMobBar, updateMobBounceAnimation } from './mob.js';
import { spawnBoss } from './boss.js';
import { spawnDrops } from './drops.js';
import { resolveVsColliders } from './collision.js';
import { showBossPanel, hideBossPanel } from './hud.js';

export class RoomManager {
    constructor(world, colliders) {
        this.world = world;
        this.colliders = colliders;

        this.currentRoomIndex = 0;
        this.currentRoom = null;

        this.roomAssets = {
            groundLayer: null,
            edges: [],
            props: [],
            decorations: []
        };

        this.boundaries = [];
    }

    getRoomBounds(room) {
        const half = (room.size || 20) * 32;
        return { half, minX: -half, maxX: half, minY: -half, maxY: half };
    }

    clearRoomAssets() {
        if (this.roomAssets.groundLayer) {
            this.world.removeChild(this.roomAssets.groundLayer);
            this.roomAssets.groundLayer.destroy({ children: true });
            this.roomAssets.groundLayer = null;
        }
        for (const edge of this.roomAssets.edges) {
            this.world.removeChild(edge);
            edge.destroy();
        }
        this.roomAssets.edges.length = 0;

        for (const prop of this.roomAssets.props) {
            this.world.removeChild(prop.container);
            prop.container.destroy({ children: true });
        }
        this.roomAssets.props.length = 0;

        for (const b of this.boundaries) {
            if (b.graphics) {
                this.world.removeChild(b.graphics);
                b.graphics.destroy();
            }
        }
        this.boundaries.length = 0;
        this.colliders.length = 0;
    }

    createRoomBoundaries(room, bounds) {
        const half = bounds.half;
        const thickness = 8;

        const walls = [
            { x: 0,     y: -half, w: half * 2, h: thickness },
            { x: 0,     y:  half, w: half * 2, h: thickness },
            { x: -half, y: 0,     w: thickness, h: half * 2 },
            { x:  half, y: 0,     w: thickness, h: half * 2 }
        ];

        for (const w of walls) {
            const g = new Graphics();
            g.rect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h).fill(0x000000);
            g.alpha = 0;
            this.world.addChild(g);

            this.boundaries.push({ x: w.x, y: w.y, w: w.w, h: w.h, graphics: g });
            this.colliders.push({ x: w.x - w.w / 2, y: w.y - w.h / 2, w: w.w, h: w.h });
        }

        const border = new Graphics();
        border
            .rect(-half, -half, half * 2, half * 2)
            .stroke({ width: 4, color: 0xffffff, alpha: 0.15 })
            .fill(0x000000, 0.05);
        this.world.addChild(border);
        this.roomAssets.edges.push(border);

        return this.boundaries;
    }

    // ─────────────────────────────
    // Entity management
    // ─────────────────────────────

    clearEntities(entities) {
        const { mobs, bosses, arrows, enemyProjs, drops } = entities;
        const clearArray = arr => {
            arr.forEach(item => { if (item.c) this.world.removeChild(item.c); });
            arr.length = 0;
        };
        clearArray(mobs);
        clearArray(bosses);
        clearArray(arrows);
        clearArray(enemyProjs);
        clearArray(drops);
    }

    spawnRoomEntities(room, bounds, entities, hudElements) {
        this.clearEntities(entities);
        const { mobs, bosses } = entities;
        const half = bounds.half;
        const biome = room.biome;

        for (let i = 0; i < room.mobs; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (half - 100);
            let x = Math.cos(angle) * radius;
            let y = Math.sin(angle) * radius;
            const resolved = resolveVsColliders(x, y, MOB_RADIUS, this.colliders);
            mobs.push(spawnMob(this.world, resolved.x, resolved.y, biome));
        }

        for (let i = 0; i < room.bosses; i++) {
            let bx = 0, by = 0;
            for (let j = 0; j < 50; j++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * (half - 150);
                bx = Math.cos(angle) * radius;
                by = Math.sin(angle) * radius;
                const resolved = resolveVsColliders(bx, by, BOSS_RADIUS, this.colliders);
                if (Math.abs(resolved.x - bx) < 0.1 && Math.abs(resolved.y - by) < 0.1) {
                    bx = resolved.x; by = resolved.y;
                    break;
                }
            }
            const b = spawnBoss(this.world, room.bossType || 'desert', bx, by, 1);
            bosses.push(b);
            showBossPanel(hudElements, b);
        }

        // Return the last boss as the active one (or null)
        return bosses.length > 0 ? bosses[bosses.length - 1] : null;
    }

    checkRoomClear(entities, onClear) {
        const { mobs, bosses } = entities;
        const noMobs = mobs.length === 0;
        const noBosses = bosses.length === 0 || bosses.every(b => b.dead === true);
        if (noMobs && noBosses) onClear();
    }

    // ─────────────────────────────
    // LOAD ROOM
    // ─────────────────────────────
    async loadRoom(index, onRoomLoaded) {
        if (!ROOMS[index]) return false;

        this.clearRoomAssets();
        this.currentRoomIndex = index;
        this.currentRoom = ROOMS[index];

        const bounds = this.getRoomBounds(this.currentRoom);
        const ground = await buildGround(this.world, this.currentRoom);
        this.roomAssets.groundLayer = ground.layer;

        this.createRoomBoundaries(this.currentRoom, bounds);

        const props = await scatterProps(this.world, this.colliders, this.currentRoom);
        this.roomAssets.props = props;

        if (onRoomLoaded) {
            onRoomLoaded({
                bounds,
                spawnX: 0,
                spawnY: bounds.half - 60,
                room: this.currentRoom,
            });
        }

        return true;
    }

    // ─────────────────────────────
    // Helpers
    // ─────────────────────────────
    getCurrentBounds() {
        if (!this.currentRoom) return null;
        return this.getRoomBounds(this.currentRoom);
    }

    isInsideRoom(x, y, r = 0) {
        const b = this.getCurrentBounds();
        if (!b) return false;
        return x - r >= b.minX && x + r <= b.maxX && y - r >= b.minY && y + r <= b.maxY;
    }

    clampToRoom(x, y, r = 0) {
        const b = this.getCurrentBounds();
        if (!b) return { x, y };
        return {
            x: Math.max(b.minX + r, Math.min(b.maxX - r, x)),
            y: Math.max(b.minY + r, Math.min(b.maxY - r, y))
        };
    }

    // roomManager.js — add method:
    getProps() {
        return this.roomAssets.props;
    }
}