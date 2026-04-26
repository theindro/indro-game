import { Sprite } from 'pixi.js';
import {useGameStore} from "../../stores/gameStore.js";

export function createDashAbility({ input, world }) {

    let dashCooldown = 0;
    let dashTime = 0;
    let dashDirX = 0;
    let dashDirY = 0;
    let lastDirX = 0;
    let lastDirY = -1;

    // ghost trail
    const ghosts = [];

    function tryDash() {
        const {x: px, y: py, stats} = useGameStore.getState().player;

        if (dashCooldown > 0 || dashTime > 0) return null;

        let dx = 0;
        let dy = 0;

        if (input.isDown('w')) dy -= 1;
        if (input.isDown('s')) dy += 1;
        if (input.isDown('a')) dx -= 1;
        if (input.isDown('d')) dx += 1;

        let dist = Math.hypot(dx, dy);

        // fallback to last direction
        if (dist === 0) {
            dx = lastDirX;
            dy = lastDirY;
            dist = Math.hypot(dx, dy) || 1;
        }

        dashDirX = dx / dist;
        dashDirY = dy / dist;

        lastDirX = dashDirX;
        lastDirY = dashDirY;

        dashTime = stats.dashDuration;
        dashCooldown = stats.dashCooldown;

        return { dashDirX, dashDirY };
    }

    function spawnGhost(playerSprite, px, py) {
        if (!playerSprite) return;

        const ghost = new Sprite(playerSprite.texture);

        ghost.anchor.set(0.5);
        ghost.x = px;
        ghost.y = py;

        ghost.alpha = 0.4;

        // stretch effect (motion feel)
        ghost.scale.set(
            playerSprite.scale.x * 1.15,
            playerSprite.scale.y * 0.85
        );

        ghost.tint = 0x66ccff;

        world.addChild(ghost);
        ghosts.push(ghost);
    }

    function update(stats, dt) {
        // track movement direction
        let dx = 0;
        let dy = 0;

        if (input.isDown('w')) dy -= 1;
        if (input.isDown('s')) dy += 1;
        if (input.isDown('a')) dx -= 1;
        if (input.isDown('d')) dx += 1;

        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            lastDirX = dx / dist;
            lastDirY = dy / dist;
        }

        if (dashCooldown > 0) dashCooldown--;

        // 🔴 DASH ACTIVE
        if (dashTime > 0) {
            dashTime--;

            // 🔴 compute speed FROM RANGE
            const speed = stats.dashRange / stats.dashDuration;

            return {
                active: true,
                vx: dashDirX * speed,
                vy: dashDirY * speed
            };
        }

        // 🔴 fade ghosts
        for (let i = ghosts.length - 1; i >= 0; i--) {
            const g = ghosts[i];

            g.alpha *= 0.92;

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