import {useGameStore} from "../../stores/gameStore.js";

export function createDashAbility({ input }) {

    let dashCooldown = 0;
    let dashTime = 0;
    let dashDirX = 0;
    let dashDirY = 0;
    let lastDirX = 0;
    let lastDirY = -1;

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
            const dashing = true;
            dashTime -= dt;  // ← real time
            dashTime = Math.max(0, dashTime);

            // speed = total distance / total duration (per second)
            const speed = stats.dashRange / stats.dashDuration;

            return {
                active: true,
                vx: dashDirX * speed * dt,  // ← scale by dt
                vy: dashDirY * speed * dt,
                dashing,
            };
        }

        return { active: false, vx: 0, vy: 0, dashing: false };
    }

    return {
        tryDash,
        update,
        isDashing: () => dashTime > 0
    };
}
