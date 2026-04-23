import {Graphics} from 'pixi.js';
import {buildGround} from './ground.js';
import {scatterProps} from './props.js';
import {ROOMS, MOB_RADIUS, BOSS_RADIUS} from './constants.js';
import {resolveVsColliders} from './collision.js';
import {showBossPanel} from './hud.js';
import {audioManager} from "./audio.js";
import {spawnMob} from "./controllers/createMobController.js";
import {spawnBoss} from "./controllers/createBossController.js";
import {useGameStore} from "../stores/gameStore.js";

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
        this.bossSpawnTriggered = false;
    }

    getRoomBounds(room) {
        const half = (room.size || 20) * 32;
        return {half, minX: -half, maxX: half, minY: -half, maxY: half};
    }

    clearRoomAssets() {
        if (this.roomAssets.groundLayer) {
            this.world.removeChild(this.roomAssets.groundLayer);
            this.roomAssets.groundLayer.destroy({children: true});
            this.roomAssets.groundLayer = null;
        }
        for (const edge of this.roomAssets.edges) {
            this.world.removeChild(edge);
            edge.destroy();
        }
        this.roomAssets.edges.length = 0;

        for (const prop of this.roomAssets.props) {
            this.world.removeChild(prop.container);
            prop.container.destroy({children: true});
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
            {x: 0, y: -half, w: half * 2, h: thickness},
            {x: 0, y: half, w: half * 2, h: thickness},
            {x: -half, y: 0, w: thickness, h: half * 2},
            {x: half, y: 0, w: thickness, h: half * 2}
        ];

        for (const w of walls) {
            const g = new Graphics();
            g.rect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h).fill(0x000000);
            g.alpha = 0;
            this.world.addChild(g);

            this.boundaries.push({x: w.x, y: w.y, w: w.w, h: w.h, graphics: g});
            this.colliders.push({x: w.x - w.w / 2, y: w.y - w.h / 2, w: w.w, h: w.h});
        }

        const border = new Graphics();
        border
            .rect(-half, -half, half * 2, half * 2)
            .stroke({width: 4, color: 0xffffff, alpha: 0.15})
            .fill(0x000000, 0.05);
        this.world.addChild(border);
        this.roomAssets.edges.push(border);

        return this.boundaries;
    }

    // ─────────────────────────────
    // Entity management
    // ─────────────────────────────

    clearEntities(entities) {
        const {mobs, bosses, arrows, enemyProjs, drops} = entities;
        const clearArray = arr => {
            arr.forEach(item => {
                if (item.c) this.world.removeChild(item.c);
            });
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
        const {mobs, bosses} = entities;
        const half = bounds.half;
        const biome = room.biome;

        // Store how many mobs should trigger boss
        this.bossSpawnTriggered = false;
        this.mobsToSpawn = room.mobs;
        this.bossType = room.bossType || 'desert';
        this.bossSpawnThreshold = 5; // Spawn boss when 5 mobs left

        // 🔴 RESET boss spawn flags for new room
        this.bossSpawnTriggered = false;
        this.mobsToSpawn = room.mobs;
        this.bossType = room.bossType || 'desert';
        this.bossSpawnThreshold = 5;

        const playerSafeRadius = 200; // Minimum distance from player
        const player = useGameStore.getState().player;

        // Spawn normal mobs with player avoidance
        for (let i = 0; i < room.mobs; i++) {
            let x, y;
            let attempts = 0;
            let validPosition = false;

            // Try up to 30 times to find a position away from player
            while (!validPosition && attempts < 30) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * (half - 100);
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;

                // Check distance from player
                const distFromPlayer = Math.hypot(x - player.x, y - player.y);

                // Resolve against colliders
                const resolved = resolveVsColliders(x, y, MOB_RADIUS, this.colliders);

                // Check if position is valid (not too close to player AND not colliding)
                if (distFromPlayer >= playerSafeRadius &&
                    Math.abs(resolved.x - x) < 0.1 &&
                    Math.abs(resolved.y - y) < 0.1) {
                    x = resolved.x;
                    y = resolved.y;
                    validPosition = true;
                }

                attempts++;
            }

            // If we couldn't find a perfect spot, use the last resolved position
            if (!validPosition) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * (half - 100);
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
                const resolved = resolveVsColliders(x, y, MOB_RADIUS, this.colliders);
                x = resolved.x;
                y = resolved.y;
            }

            mobs.push(spawnMob(this.world, x, y, biome));
        }
        // Don't spawn boss immediately
        return null;
    }


// Add this method to check and spawn boss
// Add this method to check and spawn boss
    checkAndSpawnBoss(entities, hudElements) {
        // Don't spawn if already triggered or if room has no boss
        if (this.bossSpawnTriggered) return false;
        if (!this.bossType) return false; // No boss configured for this room

        const {mobs, bosses} = entities;

        // Don't spawn if boss already exists
        if (bosses.length > 0) return false;

        // Check if boss should spawn
        if (mobs.length <= this.bossSpawnThreshold) {
            this.bossSpawnTriggered = true;

            const bounds = this.getCurrentBounds();
            const half = bounds.half;

            // Find safe position for boss
            let bx = 0, by = 0;
            for (let j = 0; j < 50; j++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * (half - 150);
                bx = Math.cos(angle) * radius;
                by = Math.sin(angle) * radius;
                const resolved = resolveVsColliders(bx, by, BOSS_RADIUS, this.colliders);
                if (Math.abs(resolved.x - bx) < 0.1 && Math.abs(resolved.y - by) < 0.1) {
                    bx = resolved.x;
                    by = resolved.y;
                    break;
                }
            }

            const b = spawnBoss(this.world, this.bossType, bx, by, 1);
            bosses.push(b);
            showBossPanel(hudElements, b);

            // Play boss spawn sound/effect
            if (audioManager.playSFX) {
                audioManager.playSFX('/sounds/boss-spawn.ogg', 0.5);
            }

            return true;
        }

        return false;
    }

    // Update your checkRoomClear method:
    checkRoomClear(entities, onClear, hudElements) {
        const {mobs, bosses} = entities;

        // Try to spawn boss if conditions met
        this.checkAndSpawnBoss(entities, hudElements);

        const noMobs = mobs.length === 0;
        const noBosses = bosses.length === 0 || bosses.every(b => b.dead === true);

        if (noMobs && noBosses) {
            onClear();
        }
    }

    // ─────────────────────────────
    // LOAD ROOM
    // ─────────────────────────────
    async loadRoom(index, onRoomLoaded) {
        if (!ROOMS[index]) return false;

        this.clearRoomAssets();
        this.currentRoomIndex = index;
        this.currentRoom = ROOMS[index];

        // 🔴 RESET boss spawn flags for new room
        this.bossSpawnTriggered = false;
        this.mobsToSpawn = null;
        this.bossType = null;
        this.bossSpawnThreshold = 5;


        // 🔴 PLAY MUSIC HERE
        if (this.currentRoom.music) {
            audioManager.play(this.currentRoom.music);
        }

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
        if (!b) return {x, y};
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