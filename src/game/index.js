import { Application, Container } from 'pixi.js';
import { RoomManager } from './roomManager.js';
import {createPlayerEntity, createXPSystem, updatePlayerHPBar} from './player.js';
import { updateMobBar, updateMobBounceAnimation } from './mob.js';
import { createEnemyProj } from './projectile.js';
import {burst, emitEmber, emitSmoke, tickParticles} from './particles.js';
import { tickFloats } from './floatText.js';
import { createInputManager } from './input.js';
import { updateHUD } from './hud.js';
import { resolveVsColliders, createDebugColliderToggle } from './collision.js';
import { createCombatSystem } from './combat.js';
import {
    GS, PLAYER_SPEED, PLAYER_RADIUS, MOB_RADIUS,
    CAM_SMOOTH, ICE_MOB_SHOOT_INTERVAL_BASE, ROOMS, PLAYERSTATS
} from './constants.js';
import { createDashAbility } from './abilities/dash.js';

export async function createGame(hudElements) {
    let paused = false;
    let dead = false;

    const $ = id => document.getElementById(id);
    const crosshairEl = $('crosshair');
    const levelupEl   = $('levelup');

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

    const colliders = [];
    const roomManager = new RoomManager(world, colliders);

    // Player
    const { pCont, pGlow, pBody, hpBar } = createPlayerEntity(world);
    let px = 0, py = 0;
    let pBobT = 0;

    const playerState = {
        pXP: 0, pLevel: 1, pXPNext: 100,
        pHP: 100, pMaxHP: 100,
        gold: 0,
        get px() { return px; },
        get py() { return py; },
        stats: { ...PLAYERSTATS },
    };

    // Entity arrays
    const entities = { mobs: [], bosses: [], arrows: [], enemyProjs: [], drops: [] };
    const { mobs, bosses, arrows, enemyProjs, drops } = entities;
    const particles = [], floats = [];

    // XP
    let shakeRef = { value: 0 };
    let kills = 0;
    const xp = createXPSystem(playerState, {
        burst, world, particles, levelupEl, shakeRef
    });

    // Camera
    let camX = 0, camY = 0;

    // Input
    const input = createInputManager(app.canvas);

    // Stats shorthand
    const stats = playerState.stats;
    let shootCooldown = 5;

    // Debug
    const debug = createDebugColliderToggle(world, colliders);

    const dash = createDashAbility({ input, world });

    // after killsRef and bossActiveRef are defined as refs:
    let killsRef  = { value: 0 };
    let bossActiveRef = { value: null };

    const combat = createCombatSystem({
        world, entities, particles, floats,
        playerState, shakeRef, hudElements,
        killsRef, bossActiveRef, xp, roomManager
    });

    // Pause / crosshair
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            paused = !paused;
            document.body.style.cursor = paused ? 'default' : 'none';
            const pauseEl = document.getElementById('pause-screen');
            if (pauseEl) pauseEl.style.display = paused ? 'flex' : 'none';
        }
        if (e.code === 'Space') dash.tryDash(px, py, stats);
    });

    app.canvas.addEventListener('mousemove', e => {
        crosshairEl.style.left = e.clientX + 'px';
        crosshairEl.style.top  = e.clientY + 'px';
    });

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
                roomData.room, roomData.bounds, entities, hudElements
            );
            loadingRoom = false;
        });
    }

    // Main loop
    app.ticker.add(() => {
        if (paused || dead) return;

        pBobT += 0.055;
        shootCooldown--;

        // Shooting
        if (input.mouseDown && shootCooldown <= 0) {
            const scale = world.scale.x;
            const tx = (input.mouseX - world.x) / scale;
            const ty = (input.mouseY - world.y) / scale;
            combat.tryShoot(px, py, tx, ty);
            shootCooldown = stats.attackSpeed;
        }

        // Player movement
        let nx = px, ny = py;
        let moving = false;
        const dashState = dash.update(stats, pBody, px, py);

        if (dashState.active) {
            nx += dashState.vx;
            ny += dashState.vy;
        } else {
            const spd = PLAYER_SPEED * GS * stats.moveSpeed;
            if (input.isDown('w')) { ny -= spd; moving = true; }
            if (input.isDown('s')) { ny += spd; moving = true; }
            if (input.isDown('a')) { nx -= spd; moving = true; }
            if (input.isDown('d')) { nx += spd; moving = true; }
        }

        const clamped  = roomManager.clampToRoom(nx, ny, PLAYER_RADIUS);
        const resolved = resolveVsColliders(clamped.x, clamped.y, PLAYER_RADIUS, colliders);
        px = resolved.x;
        py = resolved.y;

        pCont.x = px;
        pCont.y = py + Math.sin(pBobT) * (moving ? 1.5 : 0.5);
        pGlow.alpha = 0.12 + 0.06 * Math.sin(pBobT * 2);

        // Mobs
// Mobs
        for (let mi = mobs.length - 1; mi >= 0; mi--) {
            const m = mobs[mi];
            const dx = px - m.x, dy = py - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Chase direction (normalised)
            let moveX = 0, moveY = 0;
            if (dist > 0.01) {
                moveX = dx / dist;
                moveY = dy / dist;
            }

            // Separation — push away from nearby colliders
            const SEP_RADIUS = 100;   // how close before pushing
            const SEP_FORCE  = 2.2;  // how hard to push
            for (const col of colliders) {
                const cdx = m.x - col.x;
                const cdy = m.y - col.y;
                const cd  = Math.sqrt(cdx * cdx + cdy * cdy);
                const minD = MOB_RADIUS + col.r + SEP_RADIUS;
                if (cd < minD && cd > 0.001) {
                    const strength = (1 - cd / minD) * SEP_FORCE;
                    moveX += (cdx / cd) * strength;
                    moveY += (cdy / cd) * strength;
                }
            }

            // Mob-mob separation — stop them stacking
            const MOB_SEP = 1.2;
            for (let oi = 0; oi < mobs.length; oi++) {
                if (oi === mi) continue;
                const o = mobs[oi];
                const odx = m.x - o.x;
                const ody = m.y - o.y;
                const od  = Math.sqrt(odx * odx + ody * ody);
                const minO = MOB_RADIUS * 2 + 4;
                if (od < minO && od > 0.001) {
                    const strength = (1 - od / minO) * MOB_SEP;
                    moveX += (odx / od) * strength;
                    moveY += (ody / od) * strength;
                }
            }

            // Normalise combined direction and apply speed
            const ml = Math.sqrt(moveX * moveX + moveY * moveY);
            if (ml > 0.001) {
                moveX = (moveX / ml) * m.speed * GS;
                moveY = (moveY / ml) * m.speed * GS;
            }

            let newX = m.x + moveX;
            let newY = m.y + moveY;

            const clampedMob  = roomManager.clampToRoom(newX, newY, MOB_RADIUS);
            const resolvedMob = resolveVsColliders(clampedMob.x, clampedMob.y, MOB_RADIUS, colliders);
            m.x = resolvedMob.x; m.y = resolvedMob.y;
            m.c.x = m.x; m.c.y = m.y;

            if (m.biome === 'ice' && dist > 90 && dist < 380) {
                m.shootTimer = (m.shootTimer || 0) + 1;
                if (m.shootTimer > ICE_MOB_SHOOT_INTERVAL_BASE + Math.random() * 80) {
                    m.shootTimer = 0;
                    enemyProjs.push(createEnemyProj(world, m.x, m.y, px, py, 'ice', 5, 2.5, 6));
                }
            }

            if (dist < 26) {
                playerState.pHP -= 0.2;
                shakeRef.value = Math.max(shakeRef.value, 3);
                pBody.tint = 0xff3333;
                setTimeout(() => { pBody.tint = 0xffffff; }, 80);
            }

            updateMobBar(m, 13);
        }

        updateMobBounceAnimation(mobs);

        for (const b of bosses) {
            b.update({ px, py, colliders, roomManager, enemyProjs, playerState, shakeRef });
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
            const halfScreenW = app.screen.width  / 2 / scale;
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

        world.x = -camX * scale + app.screen.width  / 2 + sx;
        world.y = -camY * scale + app.screen.height / 2 + sy;

        // Debug tracking
        debug.tickUpdate();

        // Update player hp bar
        updatePlayerHPBar(hpBar, playerState.pHP, playerState.pMaxHP);

        // HUD
        updateHUD(hudElements, {
            pHP: playerState.pHP, pMaxHP: playerState.pMaxHP,
            pXP: playerState.pXP, pXPNext: playerState.pXPNext,
            pLevel: playerState.pLevel,
            gold: playerState.gold,   // 👈 add this
            px, py, activeBoss: bossActiveRef.value,
            currentRoom: roomManager.currentRoom
        });

        // Death
        if (playerState.pHP <= 0 && !dead) {
            dead = true;
            document.body.style.cursor = 'default';
            document.getElementById('death-kills').textContent =
                `${killsRef.value} enemies slain · level ${playerState.pLevel}`;
            document.getElementById('deathscreen').classList.add('active');
        }

        // Room clear
        if (!loadingRoom) {
            roomManager.checkRoomClear(entities, () => {
                const next = roomManager.currentRoomIndex + 1;
                if (next < ROOMS.length) loadRoom(next);
            });
        }
    });

    loadRoom(0);

    return () => {
        input.destroy();
        debug.destroy();
        app.destroy(true, { children: true });
    };
}