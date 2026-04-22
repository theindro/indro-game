import {Container, Graphics} from 'pixi.js';
import {getBiome} from './biome.js';
import {MOB_HP, MOB_SAFE_RADIUS, DIFFICULTY} from './constants.js';

/* ── visual factory ── */

export function makeMobBody(biome, size = 13) {
    const c = new Container();

    const sh = new Graphics();
    sh.ellipse(0, size + 1, size, 4).fill({color: 0, alpha: 0.22});
    c.addChild(sh);

    const glCol = biome === 'ice' ? 0x00ccff : biome === 'desert' ? 0xff8800 : 0xff1654;
    const gl = new Graphics();
    gl.circle(0, 0, size + 7).fill({color: glCol, alpha: 0.15});
    c.addChild(gl);

    const body = new Graphics();
    if (biome === 'ice') {
        body.circle(0, 0, size).fill(0x4fc3f7);
        body.circle(-4, -4, 5).fill({color: 0xb3e5fc, alpha: 0.38});
        body.moveTo(-5, -size - 3).lineTo(-2, -size + 5).lineTo(-8, -size + 5).closePath().fill(0x81d4fa);
        body.moveTo(5, -size - 3).lineTo(8, -size + 5).lineTo(2, -size + 5).closePath().fill(0x81d4fa);
    } else if (biome === 'desert') {
        body.circle(0, 0, size).fill(0xe07b00);
        body.circle(-4, -4, 5).fill({color: 0xffcc80, alpha: 0.38});
        body.rect(size - 2, -3, 8, 5).fill(0xc86800);
        body.moveTo(size + 6, -3).lineTo(size + 10, -9).lineTo(size + 8, -3).closePath().fill(0xff5500);
    } else {
        body.circle(0, 0, size).fill(0xc9184a);
        body.circle(-4, -4, 5).fill({color: 0xff6b8a, alpha: 0.38});
    }
    c.addChild(body);

    const eye = new Graphics();
    eye.circle(3, -3, 4).fill(0);
    eye.circle(4, -4, 2).fill(biome === 'ice' ? 0x00ffff : 0xff0000);
    eye.circle(5, -5, 0.8).fill({color: 0xffffff, alpha: 0.7});
    c.addChild(eye);

    const hpBg = new Graphics();
    hpBg.rect(-size - 3, -size - 14, size * 2 + 6, 5).fill({color: 0x111111, alpha: 0.8});
    c.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-size - 2, -size - 13, size * 2 + 4, 3).fill(0xff4444);
    c.addChild(hpBar);

    return {c, body, gl, hpBar};
}

/* ── hp bar updater ── */

export function updateMobBar(m, size = 13) {
    const pct = Math.max(0, m.hp / m.maxHp);
    m.hpBar.clear();
    if (pct > 0) {
        const col = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        m.hpBar.rect(-size - 2, -size - 13, (size * 2 + 4) * pct, 3).fill(col);
    }
}

/* ── spawn helper with bounce animation ── */

/**
 * Creates and returns a mob state object, also adding its visual to `world`.
 */
export function spawnMob(world, x, y, biome = null) {
    const finalBiome = biome || getBiome(x, y) || 'forest';
    const {c, body, gl, hpBar} = makeMobBody(biome, 13);

    c.x = x;
    c.y = y;
    world.addChild(c);

    const baseHp = MOB_HP * DIFFICULTY.mobHp;
    const baseSpeed = 0.78 * DIFFICULTY.mobSpeed;

    // 🔴 ADD BOUNCE ANIMATION PROPERTIES
    const bounceSpeed = 0.08 + Math.random() * 0.04; // Random bounce speed
    let bounceTime = Math.random() * Math.PI * 2; // Random starting phase
    let originalY = y; // Store original Y position

    return {
        c,
        body,
        gl,
        hpBar,
        x,
        y,
        hp: baseHp,
        maxHp: baseHp,
        speed: baseSpeed + Math.random() * 0.4 * DIFFICULTY.mobSpeed,
        hitFlash: 0,
        biome: finalBiome,
        shootTimer: 0,
        // 🔴 BOUNCE ANIMATION PROPERTIES
        bounceSpeed,
        bounceTime,
        originalY,
        bounceAmplitude: 2 + Math.random() * 2, // Random bounce height (2-4 pixels)
        scalePulse: 0, // For hit/attack pulses
    };
}

/* ── bounce animation update function ── */

/**
 * Update mob bounce animation - call this in your game loop
 * @param {Array} mobs - Array of mob objects
 * @param {number} deltaTime - Time delta (optional, default 1)
 */
export function updateMobBounceAnimation(mobs, deltaTime = 1) {
    for (const mob of mobs) {
        // Update bounce time
        mob.bounceTime += mob.bounceSpeed * deltaTime;

        // Calculate bounce offset using sine wave
        const bounceOffset = Math.sin(mob.bounceTime) * mob.bounceAmplitude;

        // Apply bounce to Y position (relative to original Y)
        mob.c.y = mob.y + bounceOffset;

        // 🔴 ADD SQUASH AND STRETCH EFFECT
        const squashScale = 1 + Math.abs(Math.sin(mob.bounceTime)) * 0.08;
        const stretchScale = 1 - Math.abs(Math.sin(mob.bounceTime)) * 0.05;

        // Apply squash/stretch based on bounce phase
        if (Math.sin(mob.bounceTime) > 0) {
            // Going up - stretch vertically
            mob.c.scale.y = stretchScale;
            mob.c.scale.x = 1 + (1 - stretchScale) * 0.5;
        } else {
            // Going down - squash vertically
            mob.c.scale.y = squashScale;
            mob.c.scale.x = 1 - (squashScale - 1) * 0.5;
        }

        // Apply hit flash if active
        if (mob.hitFlash > 0) {
            mob.hitFlash -= 0.05 * deltaTime;
            const flashIntensity = Math.min(1, mob.hitFlash);
            mob.body.tint = 0xffffff;
            mob.body.alpha = 0.5 + flashIntensity * 0.5;
        } else if (mob.body.tint !== 0xffffff) {
            mob.body.tint = 0xffffff;
            mob.body.alpha = 1;
        }
    }
}

/* ── enhanced spawnMob with bounce on spawn ── */

/**
 * Creates a mob with a spawn bounce effect
 */
export function spawnMobWithBounce(world, x, y, biome = null) {
    const mob = spawnMob(world, x, y, biome);

    // Add spawn bounce effect
    mob.bounceAmplitude = 8; // Larger bounce on spawn
    mob.bounceSpeed = 0.15;
    mob.bounceTime = -Math.PI / 2; // Start at bottom of bounce

    // Reset after first bounce
    setTimeout(() => {
        if (mob.bounceAmplitude > 4) {
            mob.bounceAmplitude = 2 + Math.random() * 2;
        }
    }, 500);

    return mob;
}

/* ── initial scatter ── */

/**
 * Spawn the starting wave of mobs.
 */
export function spawnInitialMobs(world, count) {
    const result = [];
    for (let i = 0; i < count; i++) {
        let mx, my, t = 0;
        do {
            mx = Math.random() * 1800 - 900;
            my = Math.random() * 1800 - 900;
            t++;
        } while (t < 20 && Math.sqrt(mx * mx + my * my) < MOB_SAFE_RADIUS);
        result.push(spawnMobWithBounce(world, mx, my)); // Use bounce version
    }
    return result;
}