import { Container, Graphics } from 'pixi.js';
import {
    BOSS_HP,
    BOSS_SPEED,
    BOSS_SHOOT_INTERVAL,
    BOSS_RADIUS
} from './constants.js';
import { createEnemyProj } from './projectile.js';
import { resolveVsColliders } from './collision.js';

/* ── visual factory ── */

export function makeBossBody(type) {
    const c = new Container();
    const R = 32;

    // ── Shadow ──────────────────────────────────────────────────────────────
    const sh = new Graphics();
    sh.ellipse(0, R + 6, R, 10).fill({ color: 0, alpha: 0.35 });
    c.addChild(sh);

    // ── Glow ────────────────────────────────────────────────────────────────
    const GLOW = {
        desert: 0xff8800,
        ice:    0x88eeff,
        lava:   0xff2200,
        forest: 0x44ff66,
    };
    const gl = new Graphics();
    gl.circle(0, 0, R + 14).fill({ color: GLOW[type] ?? 0x00ccff, alpha: 0.22 });
    c.addChild(gl);

    // ── Body ─────────────────────────────────────────────────────────────────
    const body = new Graphics();

    if (type === 'desert') {
        // Base + sheen
        body.circle(0, 0, R).fill(0xd4841a);
        body.circle(-10, -10, 14).fill({ color: 0xffcc80, alpha: 0.3 });
        // Horns
        body.moveTo(-16, -R).lineTo(-8, -R + 16).lineTo(-24, -R + 16).closePath().fill(0xb8681a);
        body.moveTo( 16, -R).lineTo(24, -R + 16).lineTo(  8, -R + 16).closePath().fill(0xb8681a);
        // Band
        body.rect(-R, 6, R * 2, 9).fill({ color: 0x8b5e10, alpha: 0.5 });
        // Eyes
        body.circle(-11, -5, 7).fill(0);
        body.circle(-11, -5, 4).fill(0xff6600);
        body.circle(-10, -6, 1.5).fill({ color: 0xffd700, alpha: 0.9 });
        body.circle( 11, -5, 7).fill(0);
        body.circle( 11, -5, 4).fill(0xff6600);
        body.circle( 12, -6, 1.5).fill({ color: 0xffd700, alpha: 0.9 });
        // Mouth slit
        body.rect(-10, 8, 20, 5).fill({ color: 0x8b5e10, alpha: 0.8 });

    } else if (type === 'ice') {
        // Base + inner shimmer
        body.circle(0, 0, R).fill(0x5bc8e8);
        body.circle(-8, -12, 15).fill({ color: 0xdff7ff, alpha: 0.35 });
        // Six sharp crystal spikes
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const h = 20 + (i % 2) * 10;          // alternate tall/short
            const w = 0.12;
            body.moveTo(Math.cos(a) * R,           Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h),     Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + w) * (R + h * 0.45), Math.sin(a + w) * (R + h * 0.45))
                .closePath().fill({ color: 0xb8eeff, alpha: 0.85 });
        }
        // Frost crack lines
        body.moveTo(-5, 4).lineTo(0, -2).lineTo(6, 5).stroke({ color: 0xffffff, alpha: 0.4, width: 1 });
        body.moveTo(-14, 10).lineTo(-8, 3).stroke({ color: 0xffffff, alpha: 0.3, width: 1 });
        // Eyes — pale blue with white pupil glint
        body.circle(-11, -5, 8).fill(0x0a3a50);
        body.circle(-11, -5, 5).fill(0x00ccff);
        body.circle(-10, -6, 2).fill({ color: 0xffffff, alpha: 0.95 });
        body.circle( 11, -5, 8).fill(0x0a3a50);
        body.circle( 11, -5, 5).fill(0x00ccff);
        body.circle( 12, -6, 2).fill({ color: 0xffffff, alpha: 0.95 });
        // Icy jagged mouth
        for (let x = -10; x <= 6; x += 4) {
            body.moveTo(x, 9).lineTo(x + 2, 14).lineTo(x + 4, 9).fill({ color: 0x88ddff, alpha: 0.9 });
        }

    } else if (type === 'lava') {
        // Base — dark charcoal cracked rock
        body.circle(0, 0, R).fill(0x2a1a0a);
        // Glowing lava cracks
        const cracks = [
            [[-12, -20], [-4, -8], [2, -14]],
            [[ 10, -18], [ 5,  0], [14,   6]],
            [[ -8,   4], [-2, 18], [ 6,  12]],
            [[  0, -30], [ 0,  -8]],
        ];
        for (const pts of cracks) {
            body.moveTo(...pts[0]);
            for (let i = 1; i < pts.length; i++) body.lineTo(...pts[i]);
            body.stroke({ color: 0xff4400, alpha: 0.9, width: 2.5 });
        }
        // Hot-glow overlay in cracks center
        body.circle(0, 0, 12).fill({ color: 0xff6600, alpha: 0.18 });
        // Ember spikes — 5 uneven molten blobs
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 4;
            const h = 16 + (i % 3) * 8;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + 0.22) * (R + h * 0.4), Math.sin(a + 0.22) * (R + h * 0.4))
                .closePath().fill({ color: 0xff3300, alpha: 0.85 });
        }
        // Eyes — molten orange iris
        body.circle(-11, -5, 8).fill(0x0d0800);
        body.circle(-11, -5, 5).fill(0xff4400);
        body.circle(-10, -6, 2).fill({ color: 0xffcc00, alpha: 0.95 });
        body.circle( 11, -5, 8).fill(0x0d0800);
        body.circle( 11, -5, 5).fill(0xff4400);
        body.circle( 12, -6, 2).fill({ color: 0xffcc00, alpha: 0.95 });
        // Jagged teeth — glowing
        for (let x = -12; x <= 8; x += 5) {
            body.moveTo(x, 8).lineTo(x + 2.5, 15).lineTo(x + 5, 8).fill({ color: 0xff5500, alpha: 0.8 });
        }
        // Rim glow
        body.circle(0, 0, R).fill({ color: 0xff2200, alpha: 0.08 });

    } else if (type === 'forest') {
        // Base — deep mossy green
        body.circle(0, 0, R).fill(0x2d6e30);
        body.circle(-9, -11, 13).fill({ color: 0x90ee90, alpha: 0.28 });
        // Leaf canopy spikes — organic sizes
        const leafSizes = [22, 16, 26, 14, 20, 18, 24];
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
            const h = leafSizes[i];
            const w = 0.2;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + w) * (R + h * 0.5), Math.sin(a + w) * (R + h * 0.5))
                .closePath().fill({ color: 0x4caf50, alpha: 0.92 });
            // Tiny darker leaf accent on each spike
            body.moveTo(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4))
                .lineTo(Math.cos(a) * (R + h * 0.7), Math.sin(a) * (R + h * 0.7))
                .lineTo(Math.cos(a - w * 0.5) * (R + h * 0.35), Math.sin(a - w * 0.5) * (R + h * 0.35))
                .closePath().fill({ color: 0x256427, alpha: 0.5 });
        }
        // Bark ring band
        body.rect(-R, 5, R * 2, 8).fill({ color: 0x5c3d1a, alpha: 0.45 });
        // Eyes — amber with dark slit pupils
        body.circle(-11, -5, 8).fill(0x1a1000);
        body.circle(-11, -5, 5).fill(0xc8a020);
        body.rect(-12, -8, 2, 6).fill({ color: 0x0a0800, alpha: 0.95 }); // slit pupil L
        body.circle(-10, -7, 1.5).fill({ color: 0xffe066, alpha: 0.85 });
        body.circle( 11, -5, 8).fill(0x1a1000);
        body.circle( 11, -5, 5).fill(0xc8a020);
        body.rect( 10, -8, 2, 6).fill({ color: 0x0a0800, alpha: 0.95 }); // slit pupil R
        body.circle( 12, -7, 1.5).fill({ color: 0xffe066, alpha: 0.85 });
        // Vine-like mouth curve (dots)
        for (let x = -9; x <= 9; x += 3) {
            body.circle(x, 11, 1.2).fill({ color: 0x1a4a1a, alpha: 0.9 });
        }

    } else {
        // ── Fallback: original water/electric boss ──────────────────────────
        body.circle(0, 0, R).fill(0x1a6fa8);
        body.circle(-10, -10, 13).fill({ color: 0x80dfff, alpha: 0.38 });
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
            const h = 18 + Math.random() * 14;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + 0.18) * (R + h * 0.55), Math.sin(a + 0.18) * (R + h * 0.55))
                .closePath().fill({ color: 0x7ec8e3, alpha: 0.9 });
        }
        body.circle(-11, -5, 8).fill(0);
        body.circle(-11, -5, 5).fill(0x00eeff);
        body.circle(-10, -6, 2).fill({ color: 0xffffff, alpha: 0.9 });
        body.circle( 11, -5, 8).fill(0);
        body.circle( 11, -5, 5).fill(0x00eeff);
        body.circle( 12, -6, 2).fill({ color: 0xffffff, alpha: 0.9 });
    }

    c.addChild(body);

    // ── HP Bar ───────────────────────────────────────────────────────────────
    const HP_COLORS = {
        desert: 0xff4400,
        ice:    0x00ccff,
        lava:   0xff1100,
        forest: 0x44cc44,
    };

    const hpBg = new Graphics();
    hpBg.rect(-44, -54, 88, 9).fill({ color: 0x111111, alpha: 0.85 });
    c.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-43, -53, 86, 7).fill(HP_COLORS[type] ?? 0x00aaff);
    c.addChild(hpBar);

    return { c, gl, body, hpBar };
}


/* ── MAIN SPAWN ── */

export function spawnBoss(world, type, x, y, scale = 1) {

    const { c, gl, body, hpBar } = makeBossBody(type);

    c.x = x;
    c.y = y;
    c.scale.set(scale);

    world.addChild(c);

    // 🔴 scaling
    const maxHp = BOSS_HP * scale;
    const speed = BOSS_SPEED * (1 / scale); // bigger = slower

    const boss = {
        c, gl, body, hpBar,
        x, y,
        type,
        hp: maxHp,
        maxHp,
        speed,
        radius: BOSS_RADIUS * scale,
        shootTimer: 0,
        shootInterval: BOSS_SHOOT_INTERVAL,
        wobble: 0,
        dead: false,

        update({ px, py, colliders, roomManager, enemyProjs }) {

            if (this.dead) return;

            // wobble
            this.wobble += 0.04;
            this.c.scale.set(scale + Math.sin(this.wobble) * 0.03);

            // move toward player
            const dx = px - this.x;
            const dy = py - this.y;
            const dist = Math.hypot(dx, dy);

            let nx = this.x;
            let ny = this.y;

            if (dist > 0.01) {
                nx += (dx / dist) * this.speed;
                ny += (dy / dist) * this.speed;
            }

            // clamp
            let clamped = roomManager.clampToRoom(nx, ny, this.radius);

            // collide with props
            const resolved = resolveVsColliders(
                clamped.x,
                clamped.y,
                this.radius,
                colliders
            );

            this.x = resolved.x;
            this.y = resolved.y;

            this.c.x = this.x;
            this.c.y = this.y;

            // shooting
            this.shootTimer++;

            const enraged = this.hp < this.maxHp * 0.4;
            const interval = enraged
                ? this.shootInterval * 0.6
                : this.shootInterval;

            if (this.shootTimer >= interval) {
                this.shootTimer = 0;

                enemyProjs.push(
                    createEnemyProj(
                        world,
                        this.x,
                        this.y,
                        px,
                        py,
                        this.type,
                        enraged ? 40 : 14,
                        5.2,
                        10
                    )
                );

                // spread when enraged
                if (enraged) {
                    [-0.4, 0.4].forEach(off => {
                        enemyProjs.push(
                            createEnemyProj(
                                world,
                                this.x,
                                this.y,
                                px,
                                py,
                                this.type,
                                10,
                                2.8,
                                8,
                                off
                            )
                        );
                    });
                }
            }

            updateBossBar(this);
        }
    };

    return boss;
}

/* ── HP BAR ── */

export function updateBossBar(b) {
    b.hpBar.clear();

    const p = Math.max(0, b.hp / b.maxHp);

    if (p > 0) {
        const col =
            p > 0.5 ? 0x00ff88 :
                p > 0.25 ? 0xffaa00 :
                    0xff2222;

        b.hpBar.rect(-43, -53, 86 * p, 7).fill(col);
    }
}