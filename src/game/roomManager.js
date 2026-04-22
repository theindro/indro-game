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
            ground: null,
            edges: [],
            props: [],
            decorations: []
        };
    }

    getRoomBounds(room) {
        const half = (room.size || 20) * 32;
        return {
            half,
            minX: -half,
            maxX: half,
            minY: -half,
            maxY: half,
            size: half * 2
        };
    }

    clearRoomAssets() {
        // Clear ground
        if (this.roomAssets.ground) {
            this.world.removeChild(this.roomAssets.ground);
            this.roomAssets.ground = null;
        }

        // Clear edges/borders
        this.roomAssets.edges.forEach(edge => {
            this.world.removeChild(edge);
            edge.destroy();
        });

        this.roomAssets.edges = [];

        // Clear props
        //this.roomAssets.props.forEach(prop => {
        //    if (prop.destroy) prop.destroy();
        //    this.world.removeChild(prop);
        //});

        this.roomAssets.props = [];

        // Clear colliders (room-specific)
        this.colliders.length = 0;
    }

    createRoomBoundaries(room, bounds) {
        const boundaries = [];
        const half = bounds.half;
        const thickness = 8;

        // Create invisible walls as colliders
        const walls = [
            { x: 0, y: -half + thickness/2, w: half * 2, h: thickness }, // top
            { x: 0, y: half - thickness/2, w: half * 2, h: thickness },  // bottom
            { x: -half + thickness/2, y: 0, w: thickness, h: half * 2 },  // left
            { x: half - thickness/2, y: 0, w: thickness, h: half * 2 }     // right
        ];

        walls.forEach(wall => {
            const wallGraphics = new Graphics();
            wallGraphics.rect(wall.x - wall.w/2, wall.y - wall.h/2, wall.w, wall.h);
            wallGraphics.fill(0x000000);
            wallGraphics.alpha = 0;
            this.world.addChild(wallGraphics);

            boundaries.push({
                x: wall.x,
                y: wall.y,
                w: wall.w,
                h: wall.h,
                graphics: wallGraphics
            });

            this.colliders.push({
                x: wall.x - wall.w/2,
                y: wall.y - wall.h/2,
                w: wall.w,
                h: wall.h
            });
        });

        // Visual border
        const visualBorder = new Graphics();
        visualBorder.rect(-half, -half, half * 2, half * 2);
        visualBorder.stroke({ width: 4, color: 0xffffff, alpha: 0.15 });
        visualBorder.fill(0x000000);
        visualBorder.alpha = 0.05;
        this.world.addChild(visualBorder);
        this.roomAssets.edges.push(visualBorder);

        return boundaries;
    }

    loadRoom(index, onRoomLoaded) {
        if (!ROOMS[index]) return false;

        // Clear previous room
        this.clearRoomAssets();

        // Set new room
        this.currentRoomIndex = index;
        this.currentRoom = ROOMS[index];

        const bounds = this.getRoomBounds(this.currentRoom);

        // Build ground for this room
        const ground = buildGround(this.world, this.world, this.currentRoom);
        this.roomAssets.ground = ground;

        // Create boundaries
        const boundaries = this.createRoomBoundaries(this.currentRoom, bounds);

        // Spawn props with room-specific colliders
        const roomProps = scatterProps(this.world, this.colliders, this.currentRoom);
        this.roomAssets.props = roomProps;

        // Calculate spawn position (center-bottom of room)
        const spawnX = 0;
        const spawnY = bounds.half - 60;

        // Callback with room data
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

    getCurrentBounds() {
        if (!this.currentRoom) return null;
        return this.getRoomBounds(this.currentRoom);
    }

    isInsideRoom(x, y, radius = 0) {
        const bounds = this.getCurrentBounds();
        if (!bounds) return false;

        return x - radius >= bounds.minX &&
            x + radius <= bounds.maxX &&
            y - radius >= bounds.minY &&
            y + radius <= bounds.maxY;
    }

    clampToRoom(x, y, radius = 0) {
        const bounds = this.getCurrentBounds();
        if (!bounds) return { x, y };

        return {
            x: Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x)),
            y: Math.max(bounds.minY + radius, Math.min(bounds.maxY - radius, y))
        };
    }
}