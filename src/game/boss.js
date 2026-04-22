import { Container, Graphics } from 'pixi.js';
import {
    BOSS_HP,
    BOSS_SPEED,
    BOSS_SHOOT_INTERVAL,
    BOSS_RADIUS, BIOME_COLORS
} from './constants.js';
import { createEnemyProj } from './projectile.js';
import { resolveVsColliders } from './collision.js';

export function makeBossBody(type) {
    const c = new Container();
    const R = 32;
    const biome = BIOME_COLORS[type] ?? {};

    const glowCol    = biome.glow    ?? biome.accent ?? 0x00ccff;
    const baseCol    = biome.base    ?? 0x1a6fa8;
    const accentCol  = biome.accent  ?? 0x80dfff;
    const magmaCol   = biome.magma   ?? accentCol;
    const obsidian   = biome.obsidian ?? 0x111111;

    // ── Shadow
    const sh = new Graphics();
    sh.ellipse(0, R + 6, R, 10).fill({ color: 0, alpha: 0.35 });
    c.addChild(sh);

    // ── Glow
    const gl = new Graphics();
    gl.circle(0, 0, R + 14).fill({ color: glowCol, alpha: 0.22 });
    c.addChild(gl);

    // ── Body
    const body = new Graphics();

    // Base circle + inner sheen
    body.circle(0, 0, R).fill(typeof baseCol === 'string' ? 0x2a1a0a : baseCol);
    body.circle(-9, -11, 13).fill({ color: accentCol, alpha: 0.28 });

    if (type === 'desert') {
        body.moveTo(-16, -R).lineTo(-8, -R + 16).lineTo(-24, -R + 16).closePath().fill(obsidian);
        body.moveTo( 16, -R).lineTo(24, -R + 16).lineTo(  8, -R + 16).closePath().fill(obsidian);
        body.rect(-R, 6, R * 2, 9).fill({ color: obsidian, alpha: 0.5 });
        body.circle(-11, -5, 7).fill(0);
        body.circle(-11, -5, 4).fill(glowCol);
        body.circle(-10, -6, 1.5).fill({ color: magmaCol, alpha: 0.9 });
        body.circle( 11, -5, 7).fill(0);
        body.circle( 11, -5, 4).fill(glowCol);
        body.circle( 12, -6, 1.5).fill({ color: magmaCol, alpha: 0.9 });
        body.rect(-10, 8, 20, 5).fill({ color: obsidian, alpha: 0.8 });

    } else if (type === 'ice') {
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const h = 20 + (i % 2) * 10;
            const w = 0.12;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + w) * (R + h * 0.45), Math.sin(a + w) * (R + h * 0.45))
                .closePath().fill({ color: accentCol, alpha: 0.85 });
        }
        body.moveTo(-5, 4).lineTo(0, -2).lineTo(6, 5).stroke({ color: 0xffffff, alpha: 0.4, width: 1 });
        body.moveTo(-14, 10).lineTo(-8, 3).stroke({ color: 0xffffff, alpha: 0.3, width: 1 });
        body.circle(-11, -5, 8).fill(obsidian);
        body.circle(-11, -5, 5).fill(glowCol);
        body.circle(-10, -6, 2).fill({ color: 0xffffff, alpha: 0.95 });
        body.circle( 11, -5, 8).fill(obsidian);
        body.circle( 11, -5, 5).fill(glowCol);
        body.circle( 12, -6, 2).fill({ color: 0xffffff, alpha: 0.95 });
        for (let x = -10; x <= 6; x += 4) {
            body.moveTo(x, 9).lineTo(x + 2, 14).lineTo(x + 4, 9).fill({ color: accentCol, alpha: 0.9 });
        }

    } else if (type === 'lava') {
        const cracks = [
            [[-12, -20], [-4, -8], [2, -14]],
            [[ 10, -18], [ 5,  0], [14,   6]],
            [[ -8,   4], [-2, 18], [ 6,  12]],
            [[  0, -30], [ 0,  -8]],
        ];
        for (const pts of cracks) {
            body.moveTo(...pts[0]);
            for (let i = 1; i < pts.length; i++) body.lineTo(...pts[i]);
            body.stroke({ color: glowCol, alpha: 0.9, width: 2.5 });
        }
        body.circle(0, 0, 12).fill({ color: magmaCol, alpha: 0.18 });
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 4;
            const h = 16 + (i % 3) * 8;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + 0.22) * (R + h * 0.4), Math.sin(a + 0.22) * (R + h * 0.4))
                .closePath().fill({ color: glowCol, alpha: 0.85 });
        }
        body.circle(-11, -5, 8).fill(obsidian);
        body.circle(-11, -5, 5).fill(glowCol);
        body.circle(-10, -6, 2).fill({ color: magmaCol, alpha: 0.95 });
        body.circle( 11, -5, 8).fill(obsidian);
        body.circle( 11, -5, 5).fill(glowCol);
        body.circle( 12, -6, 2).fill({ color: magmaCol, alpha: 0.95 });
        for (let x = -12; x <= 8; x += 5) {
            body.moveTo(x, 8).lineTo(x + 2.5, 15).lineTo(x + 5, 8).fill({ color: magmaCol, alpha: 0.8 });
        }
        body.circle(0, 0, R).fill({ color: glowCol, alpha: 0.08 });

    } else if (type === 'forest') {
        const leafSizes = [22, 16, 26, 14, 20, 18, 24];
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
            const h = leafSizes[i];
            const w = 0.2;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + w) * (R + h * 0.5), Math.sin(a + w) * (R + h * 0.5))
                .closePath().fill({ color: accentCol, alpha: 0.92 });
            body.moveTo(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4))
                .lineTo(Math.cos(a) * (R + h * 0.7), Math.sin(a) * (R + h * 0.7))
                .lineTo(Math.cos(a - w * 0.5) * (R + h * 0.35), Math.sin(a - w * 0.5) * (R + h * 0.35))
                .closePath().fill({ color: obsidian, alpha: 0.5 });
        }
        body.rect(-R, 5, R * 2, 8).fill({ color: obsidian, alpha: 0.45 });
        body.circle(-11, -5, 8).fill(0x1a1000);
        body.circle(-11, -5, 5).fill(glowCol);
        body.rect(-12, -8, 2, 6).fill({ color: 0x0a0800, alpha: 0.95 });
        body.circle(-10, -7, 1.5).fill({ color: magmaCol, alpha: 0.85 });
        body.circle( 11, -5, 8).fill(0x1a1000);
        body.circle( 11, -5, 5).fill(glowCol);
        body.rect( 10, -8, 2, 6).fill({ color: 0x0a0800, alpha: 0.95 });
        body.circle( 12, -7, 1.5).fill({ color: magmaCol, alpha: 0.85 });
        for (let x = -9; x <= 9; x += 3) {
            body.circle(x, 11, 1.2).fill({ color: obsidian, alpha: 0.9 });
        }

    } else {
        // fallback
        body.circle(0, 0, R).fill(typeof baseCol === 'string' ? 0x1a6fa8 : baseCol);
        body.circle(-10, -10, 13).fill({ color: accentCol, alpha: 0.38 });
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
            const h = 18 + Math.random() * 14;
            body.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                .lineTo(Math.cos(a + 0.18) * (R + h * 0.55), Math.sin(a + 0.18) * (R + h * 0.55))
                .closePath().fill({ color: accentCol, alpha: 0.9 });
        }
        body.circle(-11, -5, 8).fill(0);
        body.circle(-11, -5, 5).fill(glowCol);
        body.circle(-10, -6, 2).fill({ color: 0xffffff, alpha: 0.9 });
        body.circle( 11, -5, 8).fill(0);
        body.circle( 11, -5, 5).fill(glowCol);
        body.circle( 12, -6, 2).fill({ color: 0xffffff, alpha: 0.9 });
    }

    c.addChild(body);

    // ── HP Bar
    const hpBg = new Graphics();
    hpBg.rect(-44, -54, 88, 9).fill({ color: 0x111111, alpha: 0.85 });
    c.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-43, -53, 86, 7).fill(glowCol);
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