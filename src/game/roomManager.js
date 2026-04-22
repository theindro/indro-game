// roomManager.js
import { Graphics } from 'pixi.js';
import { buildGround } from './ground.js';
import { scatterProps } from './props.js';
import { ROOMS } from './constants.js';

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

    // ─────────────────────────────
    // Bounds
    // ─────────────────────────────
    getRoomBounds(room) {
        const half = (room.size || 20) * 32;

        return {
            half,
            minX: -half,
            maxX: half,
            minY: -half,
            maxY: half
        };
    }

    // ─────────────────────────────
    // CLEANUP (FIXED)
    // ─────────────────────────────
    clearRoomAssets() {
        // Ground
        if (this.roomAssets.groundLayer) {
            this.world.removeChild(this.roomAssets.groundLayer);
            this.roomAssets.groundLayer.destroy({ children: true });
            this.roomAssets.groundLayer = null;
        }

        // Edges
        for (const edge of this.roomAssets.edges) {
            this.world.removeChild(edge);
            edge.destroy();
        }
        this.roomAssets.edges.length = 0;

        // Props
        for (const prop of this.roomAssets.props) {
            this.world.removeChild(prop.container);
            prop.container.destroy({ children: true });
        }
        this.roomAssets.props.length = 0;

        // Boundaries graphics
        for (const b of this.boundaries) {
            if (b.graphics) {
                this.world.removeChild(b.graphics);
                b.graphics.destroy();
            }
        }
        this.boundaries.length = 0;

        // Colliders reset (IMPORTANT)
        this.colliders.length = 0;
    }

    // ─────────────────────────────
    // ROOM BORDERS
    // ─────────────────────────────
    createRoomBoundaries(room, bounds) {
        const half = bounds.half;
        const thickness = 8;

        const walls = [
            { x: 0, y: -half, w: half * 2, h: thickness },
            { x: 0, y: half,  w: half * 2, h: thickness },
            { x: -half, y: 0, w: thickness, h: half * 2 },
            { x: half, y: 0,  w: thickness, h: half * 2 }
        ];

        for (const w of walls) {
            const g = new Graphics();
            g.rect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h).fill(0x000000);
            g.alpha = 0;

            this.world.addChild(g);

            this.boundaries.push({
                x: w.x,
                y: w.y,
                w: w.w,
                h: w.h,
                graphics: g
            });

            this.colliders.push({
                x: w.x - w.w / 2,
                y: w.y - w.h / 2,
                w: w.w,
                h: w.h
            });
        }

        // Visual border
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
    // LOAD ROOM (FIXED FLOW)
    // ─────────────────────────────
    async loadRoom(index, onRoomLoaded) {
        if (!ROOMS[index]) return false;

        // cleanup previous
        this.clearRoomAssets();

        this.currentRoomIndex = index;
        this.currentRoom = ROOMS[index];

        const bounds = this.getRoomBounds(this.currentRoom);

        // ── Ground (await FIXED)
        const ground = await buildGround(this.world, this.currentRoom);
        this.roomAssets.groundLayer = ground.layer;

        // ── Boundaries
        const boundaries = this.createRoomBoundaries(this.currentRoom, bounds);

        // ── Props (await FIXED)
        const props = await scatterProps(this.world, this.colliders, this.currentRoom);
        this.roomAssets.props = props;

        // spawn position
        const spawnX = 0;
        const spawnY = bounds.half - 60;

        if (onRoomLoaded) {
            onRoomLoaded({
                bounds,
                spawnX,
                spawnY,
                room: this.currentRoom,
                boundaries
            });
        }

        return true;
    }

    // ─────────────────────────────
    // HELPERS
    // ─────────────────────────────
    getCurrentBounds() {
        if (!this.currentRoom) return null;
        return this.getRoomBounds(this.currentRoom);
    }

    isInsideRoom(x, y, r = 0) {
        const b = this.getCurrentBounds();
        if (!b) return false;

        return (
            x - r >= b.minX &&
            x + r <= b.maxX &&
            y - r >= b.minY &&
            y + r <= b.maxY
        );
    }

    clampToRoom(x, y, r = 0) {
        const b = this.getCurrentBounds();
        if (!b) return { x, y };

        return {
            x: Math.max(b.minX + r, Math.min(b.maxX - r, x)),
            y: Math.max(b.minY + r, Math.min(b.maxY - r, y))
        };
    }
}