import {Application, Container} from 'pixi.js';
import {createPlayerEntity} from './entities/createPlayerEntity.js';
import {tickParticles} from './particles.js';
import {tickFloats} from './floatText.js';
import {createInputManager} from './input.js';
import {createDebugColliderToggle, resolveVsColliders} from './world/collision.js';
import {createCombatController} from './controllers/createCombatController.js';
import {GS, PLAYER_SPEED, PLAYER_RADIUS, CAM_SMOOTH} from './constants.js';
import {createDashAbility} from './abilities/Dash.js';
import {createPlayerController} from "./controllers/createPlayerController.js";
import {useGameStore} from '../stores/gameStore.js';
import {createDevTool} from "./devtool.js";
import {CreateWeatherController} from "./controllers/createWeatherController.js";
import {OpenWorldManager} from "./world/OpenWorldManager.js";
import {PerformanceMonitor} from './world/PerformanceMonitor.js';
import {MinimapManager} from "./world/MinimapManager.js";

export async function createGame() {
    // ==================== INITIALIZATION ====================
    const app = await initApp();
    const world = createWorldContainer(app);

    // ==================== GAME STATE ====================
    const colliders = [];
    const particles = [];
    const floats = [];
    let mouseWorld = {x: 0, y: 0};
    let camX = 0, camY = 0;
    let pBobT = 0;
    let saveTimer = 0;
    let shootCooldown = 0;
    let shakeRef = {value: 0};
    let killsRef = {value: 0};
    let bossActiveRef = {value: null};
    let lastWeatherBiome = null;

    // ==================== SYSTEMS ====================
    const weatherSystem = initWeatherSystem(app);
    const input = createInputManager(app.canvas);
    const debug = createDebugColliderToggle(world, colliders);
    const perfMonitor = new PerformanceMonitor();

    createDevTool(useGameStore);

    // ==================== PLAYER ====================
    const {pCont, pGlow, pBody, hpBar} = createPlayerEntity(world);
    let px = 0, py = 0;

    const playerController = createPlayerController({
        pBody, hpBar, shakeRef, world, particles, floats
    });

    const playerState = useGameStore.getState().player;

    // ==================== ENTITIES ====================
    const entities = {
        mobs: [],
        bosses: [],
        arrows: [],
        enemyProjs: [],
        drops: [],
    };

    // ==================== WORLD ====================
    const openWorld = new OpenWorldManager(world, colliders, app.renderer);

    openWorld.setEntitiesList(entities);

    // ==================== COMBAT ====================
    const combat = createCombatController({
        world, entities, particles, floats,
        shakeRef, killsRef, bossActiveRef,
        openWorld, colliders
    });

    // ==================== ABILITIES ====================
    const dash = createDashAbility({input, world});

    // ==================== UI ====================
    const minimap = new MinimapManager(app, openWorld, {x: px, y: py, rotation: 0}, entities);

    // ==================== SETUP ====================
    setupEventListeners(input, dash, combat, playerState.stats, mouseWorld, entities.bosses, shakeRef, openWorld);
    setupChunkChangeHandler(openWorld, weatherSystem);
    setupCrosshairHandler(app);

    // Initial player position
    pCont.x = px;
    pCont.y = py;
    openWorld.entityLayer.addChild(pCont);

    // ==================== GAME LOOP ====================
    app.ticker.add((ticker) => {
        const store = useGameStore.getState();
        const {gameState, player: playerState} = store;
        const deltaTime = ticker.deltaTime;

        if (gameState.paused || gameState.dead) return;

        perfMonitor.update(entities.mobs.length);

        // Auto-save
        saveTimer++;
        saveTimer = updateAutoSave(store, px, py, saveTimer) ?? saveTimer;

        // Update cooldowns
        if (shootCooldown > 0) shootCooldown--;
        if (combat.updateFreezeTimers) combat.updateFreezeTimers(deltaTime);

        // Shooting
        shootCooldown = handleShooting(input, combat, px, py, world, shootCooldown, playerState.stats);

        // Player movement
        const movement = handlePlayerMovement(input, px, py, playerState.stats, dash, openWorld, colliders);
        px = movement.x;
        py = movement.y;
        pBobT += 0.055;

        // Update visuals
        updatePlayerVisuals(pCont, pGlow, px, py, movement.moving, pBobT);

        // World updates
        openWorld.update(px, py, deltaTime);
        updateBosses(entities.bosses, px, py, colliders, openWorld, entities.enemyProjs, playerState, shakeRef, deltaTime);

        // Combat updates
        combat.updateArrows(px, py);
        combat.updateEnemyProjs(px, py);
        combat.updateDrops(px, py);

        // Particles & floats
        tickParticles(world, particles);
        tickFloats(floats, camX, camY, app.screen.width, app.screen.height);

        // Camera
        const camera = updateCamera(camX, camY, px, py, world, app, openWorld, shakeRef);
        camX = camera.x;
        camY = camera.y;
        world.x = camera.worldX;
        world.y = camera.worldY;

        // Weather
        updateWeather(weatherSystem, deltaTime, camX, camY, openWorld);

        // Minimap
        updateMinimap(minimap, px, py, input, world, mouseWorld);

        // Debug
        debug.tickUpdate();

        // Death check
        checkDeath(playerState, gameState, killsRef);
    });

    return () => cleanup(input, debug, app);
}

// ==================== HELPER FUNCTIONS ====================

async function initApp() {
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
    return app;
}

function createWorldContainer(app) {
    const world = new Container();
    world.scale.set(1.25);
    app.stage.addChild(world);
    app.stage.roundPixels = true;
    return world;
}

function initWeatherSystem(app) {
    const weatherSystem = new CreateWeatherController(app.stage, app);
    app.stage.addChild(weatherSystem.container);
    app.stage.setChildIndex(weatherSystem.container, app.stage.children.length - 1);
    return weatherSystem;
}

// Key listeners
function setupEventListeners(input, dash, combat, stats, mouseWorld, bosses, shakeRef, openWorld) {

    window.addEventListener('keydown', (e) => {
        const key = e.key;

        console.log(e);

        if (e.code === 'Space') dash.tryDash();

        if (e.key === 'Escape') {
            useGameStore.getState().togglePause();

            const currentState = useGameStore.getState().gameState;

            document.body.style.cursor = currentState.paused ? 'default' : 'none';
        }

        switch (key) {
            case '1':
                combat.useArrowBarrage(mouseWorld.x, mouseWorld.y);
                break;
            case '2':
                combat.useRapidFire(mouseWorld.x, mouseWorld.y);
                break;
            case '3':
                console.log('Ability 3 used!');
                break;
            case '4':
                combat.useFrostArrow(mouseWorld.x, mouseWorld.y);
                break;
        }

        if (e.key === 'b' || e.key === 'B') {
            spawnTestBoss(bosses, shakeRef, openWorld);
        }
    });
}

function setupChunkChangeHandler(openWorld, weatherSystem) {
    let lastWeatherBiome = null;

    openWorld.onChunkChangeCallback = (info) => {
        if (info.biome === lastWeatherBiome) return;
        lastWeatherBiome = info.biome;

        const weatherConfig = {
            forest: {type: 'rain', intensity: 1, speed: 1.0},
            desert: {type: 'sandstorm', intensity: 0.7, speed: 1.2},
            ice: {type: 'snow', intensity: 0.6, speed: 0.8},
            lava: {type: 'embers', intensity: 0.8, speed: 0.8}
        };

        const weather = weatherConfig[info.biome];
        if (weather) {
            weatherSystem.setWeather(weather.type, weather.intensity, weather.speed);
        }
    };
}

function setupCrosshairHandler(app) {
    app.canvas.addEventListener('mousemove', (e) => {
        const crosshairEl = document.getElementById('crosshair');
        if (crosshairEl) {
            crosshairEl.style.left = e.clientX + 'px';
            crosshairEl.style.top = e.clientY + 'px';
        }
    });
}

async function spawnTestBoss(bosses, shakeRef, openWorld) {
    const {x: px, y: py} = useGameStore.getState().player;
    console.log('🎮 Spawning test boss!');

    if (bosses.length > 0) {
        console.log('Boss already exists!');
        return;
    }

    const {spawnBoss} = await import('./controllers/createBossController.js');
    const bossX = px + 300;
    const bossY = py + 200;
    const boss = spawnBoss(openWorld.entityLayer, 'lava', bossX, bossY, 1);
    bosses.push(boss);

    console.log(`🔥 Boss spawned at (${bossX}, ${bossY}) on entityLayer`);
    shakeRef.value = 10;

    if (window.audioManager) {
        window.audioManager.playSFX('/sounds/boss-spawn.ogg', 0.5);
    }
}

function handleShooting(input, combat, px, py, world, shootCooldown, stats) {

    if (input.mouseDown && shootCooldown <= 0) {
        const scale = world.scale.x;
        const tx = (input.mouseX - world.x) / scale;
        const ty = (input.mouseY - world.y) / scale;
        combat.tryShoot(px, py, tx, ty);
        return stats.attackSpeed;
    }

    return shootCooldown;
}

function handlePlayerMovement(input, px, py, stats, dash, openWorld, colliders) {
    let nx = px, ny = py;
    let moving = false;

    const dashState = dash.update(stats);

    if (dashState.active) {
        nx += dashState.vx;
        ny += dashState.vy;
    } else {
        const spd = PLAYER_SPEED * GS * stats.moveSpeed;
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

    const clamped = openWorld.clampToWorld(nx, ny, PLAYER_RADIUS);
    const resolved = resolveVsColliders(clamped.x, clamped.y, PLAYER_RADIUS, colliders);

    return {x: resolved.x, y: resolved.y, moving};
}

function updatePlayerVisuals(pCont, pGlow, px, py, moving, pBobT) {
    pCont.x = px;
    pCont.y = py + Math.sin(pBobT) * (moving ? 1.5 : 0.5);
    pGlow.alpha = 0.12 + 0.06 * Math.sin(pBobT * 2);
}

function updateBosses(bosses, px, py, colliders, openWorld, enemyProjs, playerState, shakeRef, deltaTime) {
    for (const boss of bosses) {
        boss.update({
            px, py, colliders, openWorld,
            enemyProjs, playerState, shakeRef,
            deltaTime
        });
    }
}

function updateCamera(camX, camY, px, py, world, app, openWorld, shakeRef) {
    let newCamX = camX + (px - camX) * CAM_SMOOTH;
    let newCamY = camY + (py - camY) * CAM_SMOOTH;

    const scale = world.scale.x;
    const bounds = openWorld.getCurrentBounds();

    if (bounds) {
        const halfScreenW = app.screen.width / 2 / scale;
        const halfScreenH = app.screen.height / 2 / scale;
        newCamX = Math.max(bounds.minX + halfScreenW, Math.min(bounds.maxX - halfScreenW, newCamX));
        newCamY = Math.max(bounds.minY + halfScreenH, Math.min(bounds.maxY - halfScreenH, newCamY));
    }

    const shakeAmt = shakeRef.value;
    const sx = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
    const sy = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
    shakeRef.value *= 0.82;
    if (shakeRef.value < 0.08) shakeRef.value = 0;

    return {
        x: newCamX,
        y: newCamY,
        worldX: -newCamX * scale + app.screen.width / 2 + sx,
        worldY: -newCamY * scale + app.screen.height / 2 + sy
    };
}

function updateWeather(weatherSystem, deltaTime, camX, camY, openWorld) {
    const bounds = openWorld.getCurrentBounds();
    if (weatherSystem.currentWeather && bounds) {
        weatherSystem.update(deltaTime, camX, camY, bounds);
    }
}

function updateMinimap(minimap, px, py, input, world, mouseWorld) {
    minimap.playerRef.x = px;
    minimap.playerRef.y = py;

    mouseWorld.x = (input.mouseX - world.x) / world.scale.x;
    mouseWorld.y = (input.mouseY - world.y) / world.scale.x;

    let angleToMouse = Math.atan2(mouseWorld.y - py, mouseWorld.x - px);
    angleToMouse += Math.PI / 2;
    minimap.playerRef.rotation = angleToMouse;
    minimap.update();
}

function updateAutoSave(store, px, py, saveTimer) {
    if (saveTimer >= 30) {  // Changed from 60 to 500 for less spam
        store.updatePlayerPosition(px, py);
        console.log(`player pos ${px} ${py}`)
        return 0;  // Reset timer
    }
}

function checkDeath(playerState, gameState, killsRef) {
    if (playerState.hp <= 0 && !gameState.dead) {
        useGameStore.getState().setDead(true);
        document.body.style.cursor = 'default';
        document.getElementById('death-kills').textContent = `${killsRef.value} enemies slain · level ${playerState.pLevel}`;
        document.getElementById('deathscreen').classList.add('active');
    }
}

function cleanup(input, debug, app) {
    input.destroy();
    debug.destroy();
    app.destroy(true, {children: true});
}