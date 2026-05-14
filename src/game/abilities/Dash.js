import { Sprite } from 'pixi.js';
import {useGameStore} from "../../stores/gameStore.js";

export function createDashAbility({ input, world }) {

    let dashCooldown = 0;
    let dashTime = 0;
    let dashDirX = 0;
    let dashDirY = 0;
    let lastDirX = 0;
    let lastDirY = -1;

    const ghosts = [];

    function tryDash() {
        const store = useGameStore.getState();
        const { stats } = store.player;

        if (dashCooldown > 0 || dashTime > 0) return null;

        const success = store.useDash();
        if (!success) return null;

        dashCooldown = stats.dashCooldown;   // now treated as seconds
        dashTime = stats.dashDuration;        // now treated as seconds

        let dx = 0, dy = 0;
        if (input.isDown('w')) dy -= 1;
        if (input.isDown('s')) dy += 1;
        if (input.isDown('a')) dx -= 1;
        if (input.isDown('d')) dx += 1;

        let dist = Math.hypot(dx, dy);
        if (dist === 0) {
            dx = lastDirX;
            dy = lastDirY;
            dist = Math.hypot(dx, dy) || 1;
        }

        dashDirX = dx / dist;
        dashDirY = dy / dist;
        lastDirX = dashDirX;
        lastDirY = dashDirY;

        return { dashDirX, dashDirY };
    }

    function spawnGhost(playerSprite, px, py) {
        if (!playerSprite) return;

        const ghost = new Sprite(playerSprite.texture);
        ghost.anchor.set(0.5);
        ghost.x = px;
        ghost.y = py;
        ghost.alpha = 0.4;
        ghost.scale.set(
            playerSprite.scale.x * 1.15,
            playerSprite.scale.y * 0.85
        );
        ghost.tint = 0x66ccff;
        world.addChild(ghost);
        ghosts.push(ghost);
    }

    function update(stats, dt) {  // dt in seconds
        let dx = 0, dy = 0;
        if (input.isDown('w')) dy -= 1;
        if (input.isDown('s')) dy += 1;
        if (input.isDown('a')) dx -= 1;
        if (input.isDown('d')) dx += 1;

        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            lastDirX = dx / dist;
            lastDirY = dy / dist;
        }

        if (dashCooldown > 0) dashCooldown -= dt;  // ← real time

        if (dashTime > 0) {
            dashTime -= dt;  // ← real time

            // speed = total distance / total duration (per second)
            const speed = stats.dashRange / stats.dashDuration;

            return {
                active: true,
                vx: dashDirX * speed * dt,  // ← scale by dt
                vy: dashDirY * speed * dt
            };
        }

        // fade ghosts
        for (let i = ghosts.length - 1; i >= 0; i--) {
            const g = ghosts[i];
            g.alpha -= (1 - 0.92) * dt * 60; // ← framerate-independent fade
            if (g.alpha < 0.05) {
                world.removeChild(g);
                ghosts.splice(i, 1);
            }
        }

        return { active: false, vx: 0, vy: 0 };
    }

    return {
        tryDash,
        update,
        isDashing: () => dashTime > 0
    };
}
