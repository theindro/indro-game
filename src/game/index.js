import {Application, Container} from 'pixi.js';
import {createPlayerEntity} from './entities/createPlayerEntity.js';
import {tickParticles} from './utils/particles.js';
import {tickFloats} from './utils/floatText.js';
import {createInputManager} from './controllers/createInputController.js';
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
import {VFX} from './GlobalEffects.js';

export async function createGame() {
    // ==================== INITIALIZATION ====================
    const app = await initApp();
    const world = createWorldContainer(app);

    // ==================== GAME STATE ====================
    const colliders = [];
    const particles = [];
    const floats = [];

    // ==================== GAME STATE ====================

    let mouseWorld = {x: 0, y: 0};
    let camX = 0, camY = 0;
    let pBobT = 0;
    let saveTimer = 0;
    let shootCooldown = 0;
    let shakeRef = {value: 0};
    let killsRef = {value: 0};
    let bossActiveRef = {value: null};

    // Initialize global VFX with our arrays
    VFX.init(world, particles);

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
        pBody, hpBar, world
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
        world, entities,
        killsRef, bossActiveRef,
        openWorld, colliders
    });

    // ==================== ABILITIES ====================
    const dash = createDashAbility({input, world});

    // ==================== UI ====================
    const minimap = new MinimapManager(app, openWorld, {x: px, y: py, rotation: 0}, entities);

    // ==================== SETUP ====================
    setupEventListeners(input, dash, combat, playerState.stats, mouseWorld, entities.bosses, openWorld);
    setupChunkChangeHandler(openWorld, weatherSystem);

    // Initial player position
    pCont.x = px;
    pCont.y = py;
    openWorld.entityLayer.addChild(pCont);

    // ==================== GAME LOOP ====================
    app.ticker.add((ticker) => {
        const store = useGameStore.getState();
        const {gameState, player: playerState} = store;
        const deltaTime = ticker.deltaTime;
        const dt = deltaTime / 60; // 1 = 60fps baseline

        if (gameState.paused || gameState.dead) return;

        perfMonitor.update(entities.mobs.length);

        // Auto-save player position
        saveTimer += dt;

        if (saveTimer >= 0.1) { // 1 seconds
            store.updatePlayerPosition(px, py);
            saveTimer = 0;
        }

        // Update cooldowns
        if (shootCooldown > 0) shootCooldown -= dt;
        if (combat.updateFreezeTimers) combat.updateFreezeTimers(dt);

        // Shooting
        shootCooldown = handleShooting(input, combat, px, py, world, shootCooldown, playerState.stats);

        // Player movement
        const movement = handlePlayerMovement(input, px, py, playerState.stats, dash, openWorld, colliders, dt);
        px = movement.x;
        py = movement.y;
        pBobT += 0.055 * dt * 60;

        // Update visuals
        updatePlayerVisuals(pCont, pGlow, px, py, movement.moving, pBobT);

        // World updates
        openWorld.update(px, py, dt);

        // boss updates
        updateBosses(entities.bosses, px, py, colliders, openWorld, entities.enemyProjs, playerState, dt);

        // Combat updates
        combat.updateArrows(px, py, dt);
        combat.updateEnemyProjs(px, py, dt);
        combat.updateDrops(px, py, dt);

        // Camera
        const camera = updateCamera(camX, camY, px, py, world, app, openWorld);
        camX = camera.x;
        camY = camera.y;
        world.x = camera.worldX;
        world.y = camera.worldY;

        // Particles & floats
        tickParticles();  // Modify tickParticles to use VFX.particles
        tickFloats(camX, camY, app.screen.width, app.screen.height);

        // Weather
        updateWeather(weatherSystem, dt, camX, camY, openWorld);

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
    return new CreateWeatherController(app, app.stage);
}

// Key listeners
function setupEventListeners(input, dash, combat, stats, mouseWorld, bosses, openWorld) {

    window.addEventListener('keydown', (e) => {
        const key = e.key;

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
            spawnTestBoss(bosses, openWorld);
        }
    });
}

function setupChunkChangeHandler(openWorld, weatherSystem) {
    let lastWeatherBiome = null;

    openWorld.onChunkChangeCallback = (info) => {
        if (info.biome === lastWeatherBiome) return;

        lastWeatherBiome = info.biome;

        const weatherConfig = {
            forest: {type: 'rain', intensity: 0.6, speed: 1.0},
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

async function spawnTestBoss(bosses, openWorld) {
    const {x: px, y: py} = useGameStore.getState().player;
    console.log('🎮 Spawning test boss!');

    const {spawnBoss} = await import('./controllers/createBossController.js');
    const bossX = px + 300;
    const bossY = py + 200;
    const boss = spawnBoss(openWorld.entityLayer, 'lava', bossX, bossY, 1);

    bosses.push(boss);

    console.log(`🔥 Boss spawned at (${bossX}, ${bossY}) on entityLayer`);
    VFX.shake(10);

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

function handlePlayerMovement(input, px, py, stats, dash, openWorld, colliders, dt) {
    let nx = px, ny = py;
    let moving = false;

    const dashState = dash.update(stats);

    if (dashState.active) {
        nx += dashState.vx;
        ny += dashState.vy;
    } else {
        const spd = PLAYER_SPEED * GS * stats.moveSpeed * dt;

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

function updateBosses(bosses, px, py, colliders, openWorld, enemyProjs, playerState, dt) {
    for (const boss of bosses) {
        boss.update({
            px, py, colliders, openWorld,
            enemyProjs, playerState,
            dt
        });
    }
}

function updateCamera(camX, camY, px, py, world, app, openWorld) { // Remove shakeRef parameter
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

    // Use VFX.shakeRef directly
    const shakeAmt = VFX.shakeRef.value;
    const sx = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
    const sy = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
    VFX.shakeRef.value *= 0.82;
    if (VFX.shakeRef.value < 0.08) VFX.shakeRef.value = 0;

    return {
        x: newCamX,
        y: newCamY,
        worldX: -newCamX * scale + app.screen.width / 2 + sx,
        worldY: -newCamY * scale + app.screen.height / 2 + sy
    };
}

function updateWeather(weatherSystem, dt, camX, camY, openWorld) {
    if (!weatherSystem.currentWeather) return;

    const bounds = openWorld.getCurrentBounds();

    weatherSystem.update(dt, camX, camY, bounds);
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