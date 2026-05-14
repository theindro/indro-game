import {Application, Container} from 'pixi.js';
import {createPlayerEntity} from './entities/createPlayerEntity.js';
import {tickParticles} from './utils/particles.js';
import {tickFloats} from './utils/floatText.js';
import {createInputManager} from './controllers/createInputController.js';
import {createDebugColliderToggle, resolveVsColliders} from './world/collision.js';
import {createCombatController} from './controllers/createCombatController.js';
import {GS, PLAYER_SPEED, PLAYER_RADIUS, CAM_SMOOTH, frameScale} from './constants.js';
import {createDashAbility} from './abilities/Dash.js';
import {createDashAfterimageEffect} from './vfx/dashAfterimageEffect.js';
import {createPlayerController} from "./controllers/createPlayerController.js";
import {useGameStore} from '../stores/gameStore.js';
import {createDevTool} from "./devtool.js";
import {CreateWeatherController} from "./controllers/createWeatherController.js";
import {OpenWorldManager} from "./world/OpenWorldManager.js";
import {PerformanceMonitor} from './world/PerformanceMonitor.js';
import {MinimapManager} from "./world/MinimapManager.js";
import {VFX} from './GlobalEffects.js';
import {ChunkMonitor} from "./world/ChunkMonitor.js";
import {createLightingController} from "./controllers/createLightingController.js";
import {audioManager} from "./utils/audioManager.js";

/** Same closing speed as legacy `current += (target-current)*alpha` once per 60fps tick, for arbitrary `dt`. */
function smoothTowardAlpha(alphaPer60FpsFrame, dt) {
    const retain = 1 - alphaPer60FpsFrame;
    return 1 - Math.pow(retain, frameScale(dt));
}

export async function createGame() {
    // ==================== INITIALIZATION ====================
    const app = await initApp();
    const world = createWorldContainer(app);
    const vfxLayer = new Container();

    // Global lighting just testing
    //const lighting = new createLightingController(app, app.screen.width, app.screen.height);

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
    let movePenalty = 1.0;
    let shakeRef = {value: 0};
    let killsRef = {value: 0};
    let bossActiveRef = {value: null};

    const entities = {
        mobs: [],
        bosses: [],
        arrows: [],
        enemyProjs: [],
        drops: [],
    };

    // ==================== SYSTEMS ====================
    const weatherSystem = initWeatherSystem(app, world);

    const input = createInputManager(app.canvas);
    const debug = createDebugColliderToggle(world, colliders, () => entities.mobs);
    const perfMonitor = new PerformanceMonitor();

    createDevTool(useGameStore);

    // ==================== PLAYER ====================
    const {pCont, pGlow, pBody, hpBar, hpBg, pShadow, tickAnimations, playWeaponShoot} = createPlayerEntity(world);
    let px = 0, py = 0;

    const playerController = createPlayerController({
        pBody, hpBar, world
    });

    const playerState = useGameStore.getState().player;

    // ==================== WORLD ====================
    const openWorld = new OpenWorldManager(world, colliders, app);

    openWorld.setEntitiesList(entities);

    const chunkMonitor = new ChunkMonitor(openWorld);

    let targetZoom = 1.1;
    let currentZoom = 1.1;

    app.canvas.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();

            const zoomSpeed = 0.1;

            if (e.deltaY > 0) {
                targetZoom -= zoomSpeed;
            } else {
                targetZoom += zoomSpeed;
            }

            targetZoom = Math.max(0.75, Math.min(1.8, targetZoom));
        },
        { passive: false }
    );

    // ==================== COMBAT ====================
    const combat = createCombatController({
        world, entities,
        killsRef, bossActiveRef,
        openWorld, colliders, playWeaponShoot
    });

    // ==================== ABILITIES ====================
    const dash = createDashAbility({input});

    // ==================== UI ====================
    const minimap = new MinimapManager(app, openWorld, {x: px, y: py, rotation: 0}, entities);

    // ==================== SETUP ====================
    setupEventListeners(input, dash, combat, playerState.stats, mouseWorld, entities.bosses, openWorld);
    setupChunkChangeHandler(openWorld, weatherSystem);

    // Initial player position
    pCont.x = px;
    pCont.y = py;

    openWorld.entityLayer.addChild(pCont);

    const dashAfterimages = createDashAfterimageEffect(
        app.renderer,
        openWorld.entityLayer,
        pCont,
        () => [hpBg, hpBar, pShadow]
    );

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            useGameStore.getState().toggleDebug();
            return;
        }

        if (e.key.toLowerCase() === 'e') {
            const ipm = openWorld.interactablePropManager;
            const result = ipm.tryInteract(px, py);

            if (result === null) {
                // Nothing in range, or harvest started (loot comes via onLoot callback)
                return;
            }

            // Instant loot (chest / container opened)
            if (result.loot && result.loot.length > 0) {
                console.log(`[Loot] Opened ${result.prop.def.label}:`, result.loot);

                for (const drop of result.loot) {
                    // Hook into your inventory / store here, e.g.:
                    // useGameStore.getState().addItem(drop.id, drop.amount);
                    console.log(`  +${drop.amount}x ${drop.id}`);
                }
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 'e') {
            openWorld.interactablePropManager.cancelInteract();
        }
    });

    openWorld.interactablePropManager.onLoot = (loot, propDef, x, y) => {
        console.log(`[Harvest Complete] ${propDef.label}:`, loot);

        for (const drop of loot) {
            console.log(drop);

            audioManager.playSFX('/sounds/popsound.wav', 0.15);

            useGameStore.getState().addItem(drop.id, drop.amount);
            console.log(`  +${drop.amount}x ${drop.id}`);
        }

        // Optionally spawn floating text / particles at (x, y)
        // VFX.floatText(`+${loot.map(d => d.amount + 'x ' + d.id).join(', ')}`, x, y);
    };

    world.addChild(vfxLayer);

    // Initialize global VFX with our arrays
    VFX.init(world, particles, openWorld.entityLayer, vfxLayer);

    // Test light
    //lighting.addLight(400, 300, 400, 0.2, '#ffb700');

    // ==================== GAME LOOP ====================
    app.ticker.add((ticker) => {
        const store = useGameStore.getState();
        const {gameState, player: playerState} = store;
        const dt = Math.min(ticker.deltaMS / 1000, 0.05); // cap at 50ms
        const fs = frameScale(dt);

        currentZoom += (targetZoom - currentZoom) * smoothTowardAlpha(0.12, dt);
        world.scale.set(currentZoom);

        // Particles & floats
        tickParticles(dt);
        tickFloats(camX, camY, app.screen.width, app.screen.height, dt);

        // Weather
        updateWeather(weatherSystem, dt, camX, camY, openWorld);

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
        // Movement penalty — use dt-scaled lerp so framerate doesn't matter
        if (input.mouseDown) {
            movePenalty = 0.45;
        } else {
            movePenalty += (1.0 - movePenalty) * (1 - Math.pow(0.1, dt));
        }

        const movement = handlePlayerMovement(
            input, px, py, playerState.stats,
            dash, openWorld, colliders, dt,
            movePenalty // ← add this param
        );

        px = movement.x;
        py = movement.y;
        pBobT += 0.055 * dt * 60;

        // Update visuals
        updatePlayerVisuals(pCont, pGlow, px, py, movement.moving, pBobT);

        const mxRel = mouseWorld.x - px;
        const myRel = mouseWorld.y - py;
        tickAnimations(pBobT, mxRel, myRel);

        dashAfterimages.update(dt, pCont.x, pCont.y, movement.dashing);

        // Update player depth zindex
        pCont.zIndex = pCont.y;

        // World updates
        openWorld.update(px, py, dt);

        // boss updates
        updateBosses(entities.bosses, px, py, colliders, openWorld, entities.enemyProjs, playerState, dt);

        // Combat updates
        combat.updateArrows(px, py, dt);
        combat.updateEnemyProjs(px, py, dt);
        combat.updateDrops(px, py, dt);

        // Camera
        const camera = updateCamera(camX, camY, px, py, world, app, openWorld, dt);
        camX = camera.x;
        camY = camera.y;
        world.x = camera.worldX;
        world.y = camera.worldY;

        // Minimap
        updateMinimap(minimap, px, py, input, world, mouseWorld);

        // Shader lighting just testing
        // lighting.updateLighting([{ x: pCont.x, y: pCont.y, radius: 1000 }], camX, camY);

        // Chunk monitor
        chunkMonitor.update(px, py);

        // Debug
        debug.tickUpdate();

        // Editor
        //openWorld.editor.update(dt);

        VFX.updateAttachments();
        VFX.updateGlow(fs);

        // Death check
        checkDeath(playerState, gameState, killsRef);
    });

    return () => {
        dashAfterimages.destroy();
        cleanup(input, debug, app, chunkMonitor, world);
    };
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

    world.scale.set(1.1);

    app.stage.addChild(world);
    app.stage.roundPixels = true;
    return world;
}

function initWeatherSystem(app, world) {
    return new CreateWeatherController(app, world);
}

// Key listeners
function setupEventListeners(input, dash, combat, stats, mouseWorld, bosses, openWorld) {

    window.addEventListener('keydown', (e) => {
        const key = e.key;

        if (e.code === 'Space') dash.tryDash();

        switch (key) {
            case '1':
                if (useGameStore.getState().player.pLevel >= 3)
                    combat.useArrowBarrage(mouseWorld.x, mouseWorld.y);
                break;
            case '2':
                if (useGameStore.getState().player.pLevel >= 5)
                    combat.useRapidFire(mouseWorld.x, mouseWorld.y);
                break;
            case '3':
                if (useGameStore.getState().player.pLevel >= 10)
                    console.log('Ability 3 used!');
                break;
            case '4':
                if (useGameStore.getState().player.pLevel >= 20)
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
    let transitionTimer = 0;
    let isTransitioning = false;

    openWorld.onChunkChangeCallback = (info) => {
        if (info.biome === lastWeatherBiome && !isTransitioning) return;

        const weatherConfig = {
            desert: {type: 'sandstorm', intensity: 0.7, speed: 1.0},
            forest: {type: 'rain', intensity: 0.7, speed: 1.0},
            ice: {type: 'snow', intensity: 0.6, speed: 0.8},
            lava: {type: 'embers', intensity: 0.8, speed: 0.8}
        };

        const weather = weatherConfig[info.biome];

        if (weather) {
            // Smooth transition over 3 seconds
            weatherSystem.setWeather(weather.type, weather.intensity, weather.speed);
            lastWeatherBiome = info.biome;
        }
    };
}

async function spawnTestBoss(bosses, openWorld) {
    const {x: px, y: py} = useGameStore.getState().player.location;
    console.log('🎮 Spawning test boss!');

    const {spawnBoss} = await import('./controllers/createBossController.js');
    const bossX = px + 300;
    const bossY = py + 200;
    const boss = spawnBoss(openWorld.entityLayer, 'lava', bossX, bossY, 1);

    bosses.push(boss);

    console.log(`🔥 Boss spawned at (${bossX}, ${bossY}) on entityLayer`);
    VFX.shake(10);

    if (window.audioManager) {
        window.audioManager.play('/sounds/boss.mp3');
    }
}

function handleShooting(input, combat, px, py, world, shootCooldown, stats) {
    if (input.mouseDown && shootCooldown <= 0) {
        // Sync to store so AbilityBar can read it
        useGameStore.getState().useBasicAttack();

        const scale = world.scale.x;
        const tx = (input.mouseX - world.x) / scale;
        const ty = (input.mouseY - world.y) / scale;
        combat.tryShoot(px, py, tx, ty);
        return stats.attackCooldown;
    }
    return shootCooldown;
}

function handlePlayerMovement(input, px, py, stats, dash, openWorld, colliders, dt, movePenalty) {
    let nx = px, ny = py;
    let moving = false;

    const dashState = dash.update(stats, dt);

    if (dashState.active) {
        nx += dashState.vx;
        ny += dashState.vy;
    } else {
        const spd = PLAYER_SPEED * GS * stats.moveSpeed * dt * movePenalty;

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

    return {x: resolved.x, y: resolved.y, moving, dashing: dashState.dashing ?? false};
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

function updateCamera(camX, camY, px, py, world, app, openWorld, dt) { // Remove shakeRef parameter
    const camBlend = smoothTowardAlpha(CAM_SMOOTH, dt);
    let newCamX = camX + (px - camX) * camBlend;
    let newCamY = camY + (py - camY) * camBlend;

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
    const shakeDecay = Math.pow(0.82, frameScale(dt));
    VFX.shakeRef.value *= shakeDecay;
    if (VFX.shakeRef.value < 0.08) VFX.shakeRef.value = 0;

    return {
        x: newCamX,
        y: newCamY,
        worldX: -newCamX * scale + app.screen.width / 2 + sx,
        worldY: -newCamY * scale + app.screen.height / 2 + sy
    };
}

function updateWeather(weatherSystem, dt, camX, camY, openWorld) {
    const bounds = openWorld.getCurrentBounds();

    weatherSystem.update(dt, camX, camY, bounds);
}

function updateMinimap(minimap, px, py, input, world, mouseWorld) {
    minimap.playerRef.x = px;
    minimap.playerRef.y = py;

    mouseWorld.x = (input.mouseX - world.x) / world.scale.x;
    mouseWorld.y = (input.mouseY - world.y) / world.scale.y;

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

function cleanup(input, debug, app, chunkMonitor, world) {
    input.destroy();
    debug.destroy();
    chunkMonitor.destroy();
    app.destroy(true, {children: true});
    world.destroy({ children: true });
}