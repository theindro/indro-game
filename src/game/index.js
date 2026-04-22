// game.js (refactored with prop collision)
import {Application, Container, Graphics} from 'pixi.js';
import { RoomManager } from './roomManager.js';
import { createPlayerEntity } from './player.js';
import {spawnMob, updateMobBar, updateMobBounceAnimation} from './mob.js';
import { spawnBoss, updateBossBar } from './boss.js';
import { createArrow, createEnemyProj } from './projectile.js';
import { spawnDrops } from './drops.js';
import { burst, tickParticles } from './particles.js';
import { showFloat, tickFloats } from './floatText.js';
import { createInputManager } from './input.js';
import { updateHUD, showBossPanel, hideBossPanel } from './hud.js';
import { resolveVsColliders, drawDebugColliders } from './collision.js'; // Add import
import {
    GS, PLAYER_SPEED, PLAYER_RADIUS, MOB_RADIUS,
    BOSS_RADIUS, ARROW_LIFE, ENEMY_PROJ_LIFE,
    XP_PER_MOB, XP_PER_BOSS, XP_PER_DROP_XP, XP_PER_DROP_LOOT,
    XP_NEXT_MULTIPLIER, HP_PER_LEVEL, CAM_SMOOTH,
    ICE_MOB_SHOOT_INTERVAL_BASE, ROOMS, PLAYERSTATS
} from './constants.js';
import { createDashAbility } from './abilities/dash.js';
import {createFireball} from "./fireball.js";

export async function createGame(hudElements) {
    let paused = false;
    let dead = false;

    // DOM elements
    const $ = id => document.getElementById(id);
    const crosshairEl = $('crosshair');
    const levelupEl = $('levelup');

    // Pixi setup
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

    // World container
    const world = new Container();

    world.scale.set(1);

    app.stage.addChild(world);
    app.stage.roundPixels = true;

    // Colliders (shared reference, cleared by RoomManager)
    const colliders = [];

    // Room Manager
    const roomManager = new RoomManager(world, colliders);

    // Player state
    const { pCont, pGlow, pBody } = createPlayerEntity(world);
    let px = 0, py = 0;
    let pHP = 100, pMaxHP = 100, pXP = 0, pLevel = 1, pXPNext = 100;
    let kills = 0;
    let pBobT = 0;

    // Entity arrays
    const mobs = [];
    const bosses = [];
    const arrows = [];
    const enemyProjs = [];
    const drops = [];
    const particles = [];
    const floats = [];

    // Camera
    let camX = 0, camY = 0, shakeAmt = 0;

    // Input
    const input = createInputManager(app.canvas);
    let mouseDown = false;

    // Stats
    let stats = PLAYERSTATS;
    let shootCooldown = 5;
    let bossActive = null;

    // Add debug mode to see colliders
    let debugMode = false;
    let debugGraphics = null;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            debugMode = !debugMode;
            toggleDebugColliders();
        }
    });

    function toggleDebugColliders() {
        if (debugGraphics) {
            world.removeChild(debugGraphics);
            debugGraphics = null;
        } else {
            debugGraphics = drawDebugColliders(world, colliders);
        }
    }

    const dash = createDashAbility({ input, world });

    // Input handlers
    app.canvas.addEventListener('mousedown', () => { mouseDown = true; });
    window.addEventListener('mouseup', () => { mouseDown = false; });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            paused = !paused;
            document.body.style.cursor = paused ? 'default' : 'none';
            const pauseEl = document.getElementById('pause-screen');
            if (pauseEl) pauseEl.style.display = paused ? 'flex' : 'none';
        }

        if (e.code === 'Space') {
            dash.tryDash(px, py, stats);
        }
    });
    app.canvas.addEventListener('mousemove', e => {
        crosshairEl.style.left = e.clientX + 'px';
        crosshairEl.style.top = e.clientY + 'px';
    });

    // Clear all entities
    function clearEntities() {
        const clearArray = (arr, removeFn) => {
            arr.forEach(item => {
                if (item.c) world.removeChild(item.c);
                if (removeFn) removeFn(item);
            });
            arr.length = 0;
        };

        clearArray(mobs);
        clearArray(bosses);
        clearArray(arrows);
        clearArray(enemyProjs);
        clearArray(drops);
    }

    // Spawn room entities
    function spawnRoomEntities(room, bounds) {
        clearEntities();
        bossActive = null;

        const half = bounds.half;
        const biome = room.biome;

        // Spawn mobs
        for (let i = 0; i < room.mobs; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (half - 100);
            let x = Math.cos(angle) * radius;
            let y = Math.sin(angle) * radius;

            // Ensure mob doesn't spawn inside a prop
            const resolved = resolveVsColliders(x, y, MOB_RADIUS, colliders);
            x = resolved.x;
            y = resolved.y;

            mobs.push(spawnMob(world, x, y, biome));
        }

        // Spawn boss
        bosses.length = 0;
        bossActive = null;

        for (let i = 0; i < room.bosses; i++) {

            let bx = 0, by = 0;

            for (let j = 0; j < 50; j++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * (half - 150);

                bx = Math.cos(angle) * radius;
                by = Math.sin(angle) * radius;

                const resolved = resolveVsColliders(bx, by, BOSS_RADIUS, colliders);

                if (Math.abs(resolved.x - bx) < 0.1 && Math.abs(resolved.y - by) < 0.1) {
                    bx = resolved.x;
                    by = resolved.y;
                    break;
                }
            }

            const b = spawnBoss(world, room.bossType || 'desert', bx, by);

            bosses.push(b);
            bossActive = b;

            showBossPanel(hudElements, b);
        }
    }

    let loadingRoom = false;

    function checkRoomClear() {
        if (loadingRoom) return;

        const noMobs = mobs.length === 0;

        const noBosses =
            bosses.length === 0 ||
            bosses.every(b => b.dead === true);

        if (noMobs && noBosses) {
            const nextIndex = roomManager.currentRoomIndex + 1;

            if (nextIndex < ROOMS.length) {
                loadingRoom = true;
                loadRoom(nextIndex);
            }
        }
    }

    // Load room
    function loadRoom(index) {
        console.log("loading room:", index);

        roomManager.loadRoom(index, (roomData) => {

            px = roomData.spawnX;
            py = roomData.spawnY;

            pCont.x = px;
            pCont.y = py;

            world.addChild(pCont);

            spawnRoomEntities(roomData.room, roomData.bounds);

            loadingRoom = false; // 🔥 IMPORTANT
        });
    }


    // XP System
    function addXP(amt) {
        pXP += amt;

        if (pXP >= pXPNext) {
            pLevel++;
            pXP = 0;
            pXPNext = Math.floor(pXPNext * XP_NEXT_MULTIPLIER);
            pMaxHP += HP_PER_LEVEL;
            pHP = pMaxHP;

            // Stat progression
            stats.damage += 3;
            if (pLevel % 2 === 0) stats.attackSpeed = Math.max(12, stats.attackSpeed - 3);
            if (pLevel % 3 === 0) stats.projectiles += 1;
            if (pLevel % 4 === 0) stats.moveSpeed += 0.05;

            burst(world, particles, px, py, 0xffd700, 25, 4);
            shakeAmt = 6;

            levelupEl.style.opacity = '1';
            setTimeout(() => { levelupEl.style.opacity = '0'; }, 1400);
        }
    }

    // Main game loop
    app.ticker.add(() => {
        if (paused || dead) return;

        pBobT += 0.055;
        shootCooldown--;

        // Shooting
        if (!paused && !dead && mouseDown && shootCooldown <= 0) {
            const scale = world.scale.x;

            const tx =
                (input.mouseX - app.screen.width / 2) / scale + px;

            const ty =
                (input.mouseY - app.screen.height / 2) / scale + py;

            for (let i = 0; i < stats.projectiles; i++) {
                const spread = (i - (stats.projectiles - 1) / 2) * 0.12;
                arrows.push(createArrow(world, px, py, tx, ty, spread));
            }

            shootCooldown = stats.attackSpeed;
        }

        // Player movement with prop collision
        let nx = px;
        let ny = py;
        let moving = false;

        // 🔴 DASH UPDATE
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

        // Clamp to room bounds first
        let clamped = roomManager.clampToRoom(nx, ny, PLAYER_RADIUS);

        // 🔴 RESOLVE PROP COLLISION FOR PLAYER
        const resolved = resolveVsColliders(clamped.x, clamped.y, PLAYER_RADIUS, colliders);
        px = resolved.x;
        py = resolved.y;

        pCont.x = px;
        pCont.y = py + Math.sin(pBobT) * (moving ? 1.5 : 0.5);
        pGlow.alpha = 0.12 + 0.06 * Math.sin(pBobT * 2);

        // Update mobs with prop collision
        for (let mi = mobs.length - 1; mi >= 0; mi--) {
            const m = mobs[mi];
            const dx = px - m.x, dy = py - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let newX = m.x;
            let newY = m.y;

            if (dist > 0.01) {
                newX += (dx / dist) * m.speed * GS;
                newY += (dy / dist) * m.speed * GS;
            }

            // Clamp to room
            let clampedMob = roomManager.clampToRoom(newX, newY, MOB_RADIUS);

            // 🔴 RESOLVE PROP COLLISION FOR MOBS
            const resolvedMob = resolveVsColliders(clampedMob.x, clampedMob.y, MOB_RADIUS, colliders);
            m.x = resolvedMob.x;
            m.y = resolvedMob.y;
            m.c.x = m.x;
            m.c.y = m.y;

            // Ice mob ranged attack
            if (m.biome === 'ice' && dist > 90 && dist < 380) {
                m.shootTimer = (m.shootTimer || 0) + 1;
                if (m.shootTimer > ICE_MOB_SHOOT_INTERVAL_BASE + Math.random() * 80) {
                    m.shootTimer = 0;
                    enemyProjs.push(createEnemyProj(world, m.x, m.y, px, py, 'ice', 5, 2.5, 6));
                }
            }

            // Contact damage
            if (dist < 26) {
                pHP -= 0.2;
                shakeAmt = Math.max(shakeAmt, 3);
                pBody.tint = 0xff3333;
                setTimeout(() => { pBody.tint = 0xffffff; }, 80);
            }

            updateMobBar(m, 13);
        }

        updateMobBounceAnimation(mobs);

        // Boss mechs
        for (const b of bosses) {
            b.update({
                px,
                py,
                colliders,
                roomManager,
                enemyProjs
            });
        }

        // Update arrows (existing code remains same)
        for (let ai = arrows.length - 1; ai >= 0; ai--) {
            const a = arrows[ai];
            a.c.x += a.vx;
            a.c.y += a.vy;
            a.life--;

            if (a.life <= 0 || !roomManager.isInsideRoom(a.c.x, a.c.y)) {
                world.removeChild(a.c);
                arrows.splice(ai, 1);
                continue;
            }

            let hit = false;

            // Check mob collisions
            for (let mi = mobs.length - 1; mi >= 0; mi--) {
                const m = mobs[mi];
                if (Math.hypot(m.x - a.c.x, m.y - a.c.y) < 16) {
                    const dmg = stats.damage + Math.floor(Math.random() * 6);
                    m.hp -= dmg;
                    burst(world, particles, m.x, m.y, 0xff4466, 7);
                    showFloat(floats, m.x, m.y - 20, `-${dmg}`, '#ff6b8a');
                    drops.push(...spawnDrops(world, m.x, m.y, 1));
                    world.removeChild(a.c);
                    arrows.splice(ai, 1);
                    hit = true;

                    if (m.hp <= 0) {
                        burst(world, particles, m.x, m.y, 0xffd700, 14, 4);
                        burst(world, particles, m.x, m.y, 0xff4466, 8, 3);
                        shakeAmt = Math.max(shakeAmt, 6);
                        addXP(XP_PER_MOB);
                        kills++;
                        hudElements.killsEl.textContent = kills;
                        hudElements.killsEl.classList.add('bump');
                        setTimeout(() => { hudElements.killsEl.classList.remove('bump'); }, 160);
                        world.removeChild(m.c);
                        mobs.splice(mi, 1);
                    }
                    break;
                }
            }

            if (hit) continue;

            // Check boss collisions
            for (const b of bosses) {
                if (b.dead) continue;
                if (Math.hypot(b.x - a.c.x, b.y - a.c.y) < BOSS_RADIUS) {
                    const dmg = 18 + Math.floor(Math.random() * 10);
                    b.hp -= dmg;
                    burst(world, particles, b.x, b.y, b.type === 'desert' ? 0xff8800 : 0x00ccff, 10, 3.5);
                    showFloat(floats, b.x, b.y - 60, `-${dmg}`, b.type === 'desert' ? '#ff8800' : '#00eeff');
                    world.removeChild(a.c);
                    arrows.splice(ai, 1);
                    hit = true;

                    if (b.hp <= 0) {
                        b.dead = true;
                        burst(world, particles, b.x, b.y, b.type === 'desert' ? 0xffa500 : 0x00eeff, 50, 6);
                        burst(world, particles, b.x, b.y, 0xffd700, 30, 5);
                        shakeAmt = 18;
                        drops.push(...spawnDrops(world, b.x, b.y, 10));
                        addXP(XP_PER_BOSS);
                        kills += 5;
                        hudElements.killsEl.textContent = kills;
                        world.removeChild(b.c);
                        showFloat(floats, b.x, b.y - 90, 'BOSS DEFEATED!', '#ffd700');
                        bossActive = null;
                        hideBossPanel(hudElements);
                    }
                    break;
                }
            }
        }

        // Update enemy projectiles (clamp to room)
        for (let ei = enemyProjs.length - 1; ei >= 0; ei--) {
            const ep = enemyProjs[ei];
            ep.c.x += ep.vx;
            ep.c.y += ep.vy;
            ep.life--;

            if (ep.life <= 0 || !roomManager.isInsideRoom(ep.c.x, ep.c.y)) {
                world.removeChild(ep.c);
                enemyProjs.splice(ei, 1);
                continue;
            }

            if (Math.hypot(px - ep.c.x, py - ep.c.y) < 16) {
                pHP -= ep.dmg;
                shakeAmt = Math.max(shakeAmt, ep.dmg * 0.25);
                pBody.tint = 0xff0000;
                setTimeout(() => { pBody.tint = 0xffffff; }, 100);
                burst(world, particles, px, py, ep.type === 'ice' ? 0x00ccff : 0xff6600, 8, 2);
                showFloat(floats, px, py - 30, `-${ep.dmg}`, '#ffaa00');
                world.removeChild(ep.c);
                enemyProjs.splice(ei, 1);
            }
        }

        // Update drops
        for (let di = drops.length - 1; di >= 0; di--) {
            const d = drops[di];
            d.vx *= 0.91;
            d.vy *= 0.91;
            d.c.x += d.vx;
            d.c.y += d.vy;
            d.bob += 0.08;
            d.c.y += Math.sin(d.bob) * 0.28;
            d.gl.alpha = 0.12 + 0.1 * Math.sin(d.bob * 2);

            const ddx = px - d.c.x, ddy = py - d.c.y;
            const ddist = Math.hypot(ddx, ddy);

            if (ddist < 120) {
                d.c.x += ddx * 0.07;
                d.c.y += ddy * 0.07;
            }

            if (ddist < 22) {
                if (d.type === 'hp') {
                    pHP = Math.min(pMaxHP, pHP + 10);
                    burst(world, particles, d.c.x, d.c.y, 0xff3366, 6, 2);
                    showFloat(floats, d.c.x, d.c.y, '+10 HP', '#ff3366');
                } else {
                    addXP(d.type === 'xp' ? XP_PER_DROP_XP : XP_PER_DROP_LOOT);
                }
                world.removeChild(d.c);
                drops.splice(di, 1);
            }
        }

        // Update particles and floats
        tickParticles(world, particles);
        tickFloats(floats, camX, camY, app.screen.width, app.screen.height);

        // Camera
        camX += (px - camX) * CAM_SMOOTH;
        camY += (py - camY) * CAM_SMOOTH;
        const sx = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
        const sy = shakeAmt ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
        shakeAmt *= 0.82;
        if (shakeAmt < 0.08) shakeAmt = 0;
        world.x = -camX + app.screen.width / 2 + sx;
        world.y = -camY + app.screen.height / 2 + sy;

        // Update debug colliders if in debug mode
        if (debugMode && debugGraphics) {
            world.removeChild(debugGraphics);
            debugGraphics = drawDebugColliders(world, colliders);
        }

        // HUD update
        updateHUD(hudElements, {
            pHP, pMaxHP, pXP, pXPNext, pLevel,
            px, py, activeBoss: bossActive,
            currentRoom: roomManager.currentRoom
        });

        // Death
        if (pHP <= 0 && !dead) {
            dead = true;
            document.body.style.cursor = 'default';
            document.getElementById('death-kills').textContent = `${kills} enemies slain · level ${pLevel}`;
            document.getElementById('deathscreen').classList.add('active');
        }

        // Check room clear
        checkRoomClear();
    });

    // Start game
    loadRoom(0);

    // Cleanup
    return () => {
        input.destroy();
        app.destroy(true, { children: true });
    };
}