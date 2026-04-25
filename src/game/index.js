import {Application, Container} from 'pixi.js';
import {createPlayerEntity,} from './entities/createPlayerEntity.js';
import {emitEmber, emitSmoke, tickParticles} from './particles.js';
import {tickFloats} from './floatText.js';
import {createInputManager} from './input.js';
import {createDebugColliderToggle, resolveVsColliders} from './collision.js';
import {createCombatSystem} from './combat.js';
import {
    GS, PLAYER_SPEED, PLAYER_RADIUS,
    CAM_SMOOTH,
} from './constants.js';
import {createDashAbility} from './abilities/dash.js';
import {createPlayerController} from "./controllers/createPlayerController.js";
import {useGameStore} from '../stores/gameStore.js';
import {createDevTool} from "./devtool.js";
import {WeatherSystem} from "./WeatherSystem.js";
import {OpenWorldManager} from "./world/OpenWorldManager.js";
import { PerformanceMonitor } from './PerformanceMonitor.js';
import {spawnBoss} from "./controllers/createBossController.js";
import {WorldHud} from "./world/WorldHud.js";
import {Minimap} from "./world/minimap.js";

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
    const weatherSystem = new WeatherSystem(app.stage, app);

// add directly to stage, not world
    app.stage.addChild(weatherSystem.container);
    app.stage.setChildIndex(weatherSystem.container, app.stage.children.length - 1);

    createDevTool(useGameStore);

    const colliders = [];

    const playerState = useGameStore.getState().player;

    let mouseWorld = { x: 0, y: 0 };


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

    const perfMonitor = new PerformanceMonitor();

    const openWorld = new OpenWorldManager(world, colliders, app.renderer);

    openWorld.setEntitiesList(entities); // Add this line

    const hud = new WorldHud(app);

    let lastWeatherBiome = null;

    openWorld.onChunkChangeCallback = (info) => {
        hud.update(info);

        if (info.biome === lastWeatherBiome) return;
        lastWeatherBiome = info.biome;

        const weatherConfig = {
            forest: { type: 'rain', intensity: 1, speed: 1.0 },
            desert: { type: 'sandstorm', intensity: 0.7, speed: 1.2 },
            ice: { type: 'snow', intensity: 0.6, speed: 0.8 },
            lava: { type: 'embers', intensity: 0.8, speed: 0.8 }
        };

        const weather = weatherConfig[info.biome];

        if (weather) {
            weatherSystem.setWeather(
                weather.type,
                weather.intensity,
                weather.speed
            );
        }
    };

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
        world,
        entities,
        particles,
        floats,
        playerState,
        shakeRef,
        killsRef,
        bossActiveRef,
        openWorld,
        colliders,     // ADD THIS - for projectile-prop collision
        // dropLayer will be added after we create it
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

    // Create minimap
    const minimap = new Minimap(app, openWorld, { x: px, y: py, rotation: 0 }, entities);

    // 🔴 TEST BOSS SPAWN - Press 'B' key to spawn a boss nearby
    window.addEventListener('keydown', (e) => {
        if (e.key === 'b' || e.key === 'B') {
            console.log('🎮 Spawning test boss!');

            // Import spawnBoss if not already imported
            import('./controllers/createBossController.js').then(({ spawnBoss }) => {
                // Spawn boss at player position + offset
                const bossX = px + 300;
                const bossY = py + 200;

                // Check if there's already a boss
                if (bosses.length > 0) {
                    console.log('Boss already exists!');
                    return;
                }

                // Spawn a lava boss on entityLayer instead of world
                const boss = spawnBoss(openWorld.entityLayer, 'lava', bossX, bossY, 1);
                bosses.push(boss);

                console.log(`🔥 Boss spawned at (${bossX}, ${bossY}) on entityLayer`);

                // Optional: Add screen shake effect
                shakeRef.value = 10;

                // Optional: Play boss spawn sound
                if (window.audioManager) {
                    window.audioManager.playSFX('/sounds/boss-spawn.ogg', 0.5);
                }
            }).catch(err => console.error('Failed to load spawnBoss:', err));
        }
    });

    // Abilities
    window.addEventListener('keydown', (e) => {
        const store = useGameStore.getState();
        const key = e.key;

        switch(key) {
            case '1':
                combat.useArrowBarrage(px, py, mouseWorld.x, mouseWorld.y);
                break;
            case '2':
                combat.useChainLightning(px, py, mouseWorld.x, mouseWorld.y);
                break;
            case '3':
                store.useAbility(3, Date.now());
                console.log('Ability 3 used!');
                break;
            case '4':
                store.useAbility(4, Date.now());
                console.log('Ability 4 used!');
                break;
        }
    });

    px = 0;
    py = 0;
    pCont.x = px;
    pCont.y = py;

    console.log(`Player spawned at (${px}, ${py})`);
    openWorld.entityLayer.addChild(pCont);

    let saveTimer = 0;
    let shootCooldown = 0;

    app.ticker.add((ticker) => {
        // Get fresh state every frame
        const store = useGameStore.getState();
        const {gameState, player: playerState} = store;
        const deltaTime = ticker.deltaTime; // Get actual delta time

        // In your ticker:
        perfMonitor.update(mobs.length);

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

        // Apply world bounds and collision
        const clamped = openWorld.clampToWorld(nx, ny, PLAYER_RADIUS);
        const resolved = resolveVsColliders(clamped.x, clamped.y, PLAYER_RADIUS, colliders);
        px = resolved.x;
        py = resolved.y;

        pCont.x = px;
        pCont.y = py + Math.sin(pBobT) * (moving ? 1.5 : 0.5);
        pGlow.alpha = 0.12 + 0.06 * Math.sin(pBobT * 2);

        openWorld.update(px, py, ticker.deltaTime);

        for (const b of bosses) {
            b.update({
                px, py, colliders, openWorld,
                enemyProjs, playerState, shakeRef,
                deltaTime: ticker.deltaTime
            });
        }

        // Enemy projectiles
        combat.updateArrows(px, py);
        combat.updateEnemyProjs(px, py, pBody);
        combat.updateDrops(px, py);

        // Particles / floats
        tickParticles(world, particles);
        tickFloats(floats, camX, camY, app.screen.width, app.screen.height);

        // Camera
        camX += (px - camX) * CAM_SMOOTH;
        camY += (py - camY) * CAM_SMOOTH;

        // Clamp camera so it never shows outside room bounds
        const scale = world.scale.x;
        const bounds = openWorld.getCurrentBounds();

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

        if (weatherSystem.currentWeather && bounds) {
            weatherSystem.update(deltaTime, camX, camY, bounds);
        }

        // Update player position for minimap first
        minimap.playerRef.x = px;
        minimap.playerRef.y = py;

        // Get mouse position in world coordinates
        mouseWorld.x = (input.mouseX - world.x) / world.scale.x;
        mouseWorld.y = (input.mouseY - world.y) / world.scale.x;

        let angleToMouse = Math.atan2(mouseWorld.y - py, mouseWorld.x - px);
        angleToMouse += Math.PI / 2; // Add 90 degrees

        minimap.playerRef.rotation = angleToMouse;

        minimap.update();

        // Death
        if (playerState.hp <= 0 && !gameState.dead) {
            useGameStore.getState().setDead(true);

            document.body.style.cursor = 'default';

            document.getElementById('death-kills').textContent = `${killsRef.value} enemies slain · level ${playerState.pLevel}`;
            document.getElementById('deathscreen').classList.add('active');
        }
    });


    return () => {
        input.destroy();
        debug.destroy();
        app.destroy(true, {children: true});
    };
}