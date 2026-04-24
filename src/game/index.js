import {Application, Container} from 'pixi.js';
import {RoomManager} from './roomManager.js';
import {createPlayerEntity,} from './entities/createPlayerEntity.js';
import {emitEmber, emitSmoke, tickParticles} from './particles.js';
import {tickFloats} from './floatText.js';
import {createInputManager} from './input.js';
import {resolveVsColliders, createDebugColliderToggle} from './collision.js';
import {createCombatSystem} from './combat.js';
import {
    GS, PLAYER_SPEED, PLAYER_RADIUS,
    CAM_SMOOTH, ROOMS,
} from './constants.js';
import {createDashAbility} from './abilities/dash.js';
import {createPlayerController} from "./controllers/createPlayerController.js";
import {useGameStore} from '../stores/gameStore.js';
import {createDevTool} from "./devtool.js";
import {WeatherSystem} from "./WeatherSystem.js";

export async function createGame() {
    const app = new Application();
    await app.init({
        background: 'BLACK',
        resizeTo: window,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    document.body.prepend(app.canvas);
    document.body.style.cursor = 'none';

    const world = new Container();
    world.scale.set(1.25);
    app.stage.addChild(world);
    app.stage.roundPixels = true;

    // In createGame, after creating weather system:
    const weatherSystem = new WeatherSystem(world, app);

    // IMPORTANT: Move weather container to the top of the display list
    world.addChild(weatherSystem.container); // Ensure it's added
    world.setChildIndex(weatherSystem.container, world.children.length - 1); // Move to top

    createDevTool(useGameStore);

    const colliders = [];
    const roomManager = new RoomManager(world, colliders);
    const playerState = useGameStore.getState().player;

    // Player
    const {pCont, pGlow, pBody, hpBar} = createPlayerEntity(world);

    // Entity arrays
    const entities = {mobs: [], bosses: [], arrows: [], enemyProjs: [], drops: []};
    const {mobs, bosses, arrows, enemyProjs, drops} = entities;
    const particles = [], floats = [];

    // XP
    let shakeRef = {value: 0};

    const player = createPlayerController({
        pBody,
        hpBar,
        shakeRef,
        world,        // For particle effects
        particles,    // For particle system
        floats,       // For floating damage text
    });

    let px = 0, py = 0;
    let pBobT = 0;


    // Camera
    let camX = 0, camY = 0;

    // Input
    const input = createInputManager(app.canvas);

    // Stats shorthand
    const stats = playerState.stats;

    // Debug
    const debug = createDebugColliderToggle(world, colliders);

    const dash = createDashAbility({input, world});

    // after killsRef and bossActiveRef are defined as refs:
    let killsRef = {value: 0};
    let bossActiveRef = {value: null};

    const combat = createCombatSystem({
        world, entities, particles, floats,
        playerState, shakeRef,
        killsRef, bossActiveRef, roomManager
    });

    // Pause/crosshair - use store
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            useGameStore.getState().togglePause();

            const currentState = useGameStore.getState().gameState;

            document.body.style.cursor = currentState.paused ? 'default' : 'none';
        }

        if (e.code === 'Space') dash.tryDash(px, py, stats);
    });

// Safely update crosshair if element exists
    app.canvas.addEventListener('mousemove', e => {
        const crosshairEl = document.getElementById('crosshair');
        if (crosshairEl) {
            crosshairEl.style.left = e.clientX + 'px';
            crosshairEl.style.top = e.clientY + 'px';
        }
    });

    const biomeWeatherMap = {
        //'desert': { type: 'sandstorm', intensity: 0.7, speed: 1.2 },
        'lava': { type: 'embers', intensity: 0.8, speed: 0.8 },
        //'ice': { type: 'snow', intensity: 0.6, speed: 0.5 },
        'forest': { type: 'rain', intensity: 0.4, speed: 1.0 },
        //'swamp': { type: 'fog', intensity: 0.5, speed: 0.3 },
        //'void': { type: 'smoke', intensity: 0.9, speed: 0.7 }
    };

    // Room loading
    let loadingRoom = false;

    function loadRoom(index) {
        loadingRoom = true;
        roomManager.loadRoom(index, roomData => {
            px = roomData.spawnX;
            py = 0;
            pCont.x = px;
            pCont.y = py;
            world.addChild(pCont);
            bossActiveRef.value = roomManager.spawnRoomEntities(
                roomData.room, roomData.bounds, entities
            );

            // Set weather based on biome with speed
            const biome = roomData.room.biome;
            const weather = biomeWeatherMap[biome];

            if (weather) {
                // Pass type, intensity, AND speed
                weatherSystem.setWeather(weather.type, weather.intensity, weather.speed);
            } else {
                weatherSystem.clear();
            }

            // CRITICAL FIX: Move weather container to the top after room loads
            if (weatherSystem.container) {
                world.addChild(weatherSystem.container);
                world.setChildIndex(weatherSystem.container, world.children.length - 1);
            }

            loadingRoom = false;
        });
    }

    let saveTimer = 0;
    let shootCooldown = 0;

    app.ticker.add((ticker) => {
        // Get fresh state every frame
        const store = useGameStore.getState();
        const {gameState, player: playerState} = store;

        if (gameState.paused || gameState.dead) return;

        // Get current stats
        const currentStats = playerState.stats;

        // Update player position in store (every 60 frames)
        saveTimer++;
        if (saveTimer >= 60) {
            store.updatePlayerPosition(px, py);
            saveTimer = 0;
        }

        pBobT += 0.055;

        // Update shoot cooldown
        if (shootCooldown > 0) {
            shootCooldown--;
        }

        // Shooting
        if (input.mouseDown && shootCooldown <= 0) {
            const scale = world.scale.x;
            const tx = (input.mouseX - world.x) / scale;
            const ty = (input.mouseY - world.y) / scale;

            combat.tryShoot(px, py, tx, ty);

            // Use current attack speed
            shootCooldown = currentStats.attackSpeed;
        }

        // Player movement
        let nx = px, ny = py;
        let moving = false;
        const dashState = dash.update(stats, pBody, px, py);

        if (dashState.active) {
            nx += dashState.vx;
            ny += dashState.vy;
        } else {
            const spd = PLAYER_SPEED * GS * currentStats.moveSpeed;
            if (input.isDown('w')) {
                ny -= spd;
                moving = true;
            }
            if (input.isDown('s')) {
                ny += spd;
                moving = true;
            }
            if (input.isDown('a')) {
                nx -= spd;
                moving = true;
            }
            if (input.isDown('d')) {
                nx += spd;
                moving = true;
            }
        }

        const clamped = roomManager.clampToRoom(nx, ny, PLAYER_RADIUS);
        const resolved = resolveVsColliders(clamped.x, clamped.y, PLAYER_RADIUS, colliders);
        px = resolved.x;
        py = resolved.y;

        pCont.x = px;
        pCont.y = py + Math.sin(pBobT) * (moving ? 1.5 : 0.5);
        pGlow.alpha = 0.12 + 0.06 * Math.sin(pBobT * 2);

        // Mobs
        for (const m of mobs) {
            m.controller.update({
                px,
                py,
                colliders,
                roomManager,
                enemyProjs,
                playerState,
                shakeRef,
                mobs,
                world
            });
        }

        for (const b of bosses) {
            b.update({px, py, colliders, roomManager, enemyProjs, playerState, shakeRef});
        }

        // Enemy projectiles
        combat.updateArrows(px, py);
        combat.updateEnemyProjs(px, py, pBody);
        combat.updateDrops(px, py);

        // Particles / floats
        tickParticles(world, particles);
        tickFloats(floats, camX, camY, app.screen.width, app.screen.height);

        // game.js — after tickParticles, only for lava biome
        if (roomManager.currentRoom?.biome === 'lava') {
            for (const prop of roomManager.getProps()) {
                prop.smokeTimer--;
                prop.emberTimer--;

                if (prop.smokeTimer <= 0) {
                    emitSmoke(world, particles, prop.x, prop.y - 40);
                    prop.smokeTimer = 18 + Math.random() * 20;
                }

                if (prop.emberTimer <= 0) {
                    emitEmber(world, particles, prop.x, prop.y - 30);
                    prop.emberTimer = 8 + Math.random() * 12;
                }
            }
        }

        // Camera
        camX += (px - camX) * CAM_SMOOTH;
        camY += (py - camY) * CAM_SMOOTH;

        // Clamp camera so it never shows outside room bounds
        const scale = world.scale.x;
        const bounds = roomManager.getCurrentBounds();

        if (bounds) {
            const halfScreenW = app.screen.width / 2 / scale;
            const halfScreenH = app.screen.height / 2 / scale;

            const camPadding = 0; // world units beyond the edge allowed

            camX = Math.max(bounds.minX + halfScreenW - camPadding, Math.min(bounds.maxX - halfScreenW + camPadding, camX));
            camY = Math.max(bounds.minY + halfScreenH - camPadding, Math.min(bounds.maxY - halfScreenH + camPadding, camY));
        }

        const shakeAmt = shakeRef.value;
        const sx = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
        const sy = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
        shakeRef.value *= 0.82;
        if (shakeRef.value < 0.08) shakeRef.value = 0;

        world.x = -camX * scale + app.screen.width / 2 + sx;
        world.y = -camY * scale + app.screen.height / 2 + sy;

        // Debug tracking
        debug.tickUpdate();

        const deltaTime = ticker.deltaTime; // Get actual delta time

        if (weatherSystem.currentWeather && bounds) {
            weatherSystem.update(deltaTime, camX, camY, bounds);
        }

        // HUD

        // Death
        if (playerState.hp <= 0 && !gameState.dead) {
            useGameStore.getState().setDead(true);

            document.body.style.cursor = 'default';

            document.getElementById('death-kills').textContent = `${killsRef.value} enemies slain · level ${playerState.pLevel}`;
            document.getElementById('deathscreen').classList.add('active');
        }

        // Room clear
        if (!loadingRoom) {
            roomManager.checkRoomClear(entities, (nextRoomIndex) => {
                const next = nextRoomIndex || roomManager.currentRoomIndex + 1;
                if (next < ROOMS.length) {
                    // Add a simple delay before loading next room
                    loadRoom(next);
                }
            });
        }
    });

    loadRoom(0);

    return () => {
        input.destroy();
        debug.destroy();
        app.destroy(true, {children: true});
    };
}