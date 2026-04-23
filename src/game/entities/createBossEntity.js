import {Container, Graphics} from "pixi.js";
import {BIOME_COLORS} from "../constants.js";

export function createBossEntity(type) {
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

    // Store decorative parts separately for animation
    const decorations = [];
    const eyes = [];

    if (type === 'desert') {
        // Static parts
        body.moveTo(-16, -R).lineTo(-8, -R + 16).lineTo(-24, -R + 16).closePath().fill(obsidian);
        body.moveTo( 16, -R).lineTo(24, -R + 16).lineTo(  8, -R + 16).closePath().fill(obsidian);
        body.rect(-R, 6, R * 2, 9).fill({ color: obsidian, alpha: 0.5 });

        // Animated eyes
        const leftEye = { x: -11, y: -5, r: 7, graphics: new Graphics() };
        const rightEye = { x: 11, y: -5, r: 7, graphics: new Graphics() };

        body.addChild(leftEye.graphics);
        body.addChild(rightEye.graphics);
        eyes.push(leftEye, rightEye);

        // Eye glow (pupils)
        const leftPupil = { x: -11, y: -5, r: 4, graphics: new Graphics() };
        const rightPupil = { x: 11, y: -5, r: 4, graphics: new Graphics() };

        body.addChild(leftPupil.graphics);
        body.addChild(rightPupil.graphics);
        eyes.push(leftPupil, rightPupil);

        // Eye cores
        const leftCore = { x: -10, y: -6, r: 1.5, graphics: new Graphics() };
        const rightCore = { x: 12, y: -6, r: 1.5, graphics: new Graphics() };

        body.addChild(leftCore.graphics);
        body.addChild(rightCore.graphics);
        eyes.push(leftCore, rightCore);

        body.rect(-10, 8, 20, 5).fill({ color: obsidian, alpha: 0.8 });

    } else if (type === 'ice') {
        // Animated ice spikes
        const spikes = [];
        for (let i = 0; i < 6; i++) {
            const spikeData = {
                angle: (i / 6) * Math.PI * 2 - Math.PI / 2,
                height: 20 + (i % 2) * 10,
                rotation: 0,
                speed: 0.02 * (i % 2 === 0 ? 1 : -1),
                graphics: new Graphics()
            };
            body.addChild(spikeData.graphics);
            spikes.push(spikeData);
        }
        c.spikes = spikes;

        // Animated lines
        const line1 = new Graphics();
        const line2 = new Graphics();
        body.addChild(line1);
        body.addChild(line2);
        c.animatedLines = [line1, line2];

        // Eyes (animated)
        const leftEye = { x: -11, y: -5, r: 8, graphics: new Graphics(), blink: 0 };
        const rightEye = { x: 11, y: -5, r: 8, graphics: new Graphics(), blink: 0 };

        body.addChild(leftEye.graphics);
        body.addChild(rightEye.graphics);
        eyes.push(leftEye, rightEye);

        const leftPupil = { x: -11, y: -5, r: 5, graphics: new Graphics() };
        const rightPupil = { x: 11, y: -5, r: 5, graphics: new Graphics() };

        body.addChild(leftPupil.graphics);
        body.addChild(rightPupil.graphics);
        eyes.push(leftPupil, rightPupil);

        const leftCore = { x: -10, y: -6, r: 2, graphics: new Graphics() };
        const rightCore = { x: 12, y: -6, r: 2, graphics: new Graphics() };

        body.addChild(leftCore.graphics);
        body.addChild(rightCore.graphics);
        eyes.push(leftCore, rightCore);

        for (let x = -10; x <= 6; x += 4) {
            body.moveTo(x, 9).lineTo(x + 2, 14).lineTo(x + 4, 9).fill({ color: accentCol, alpha: 0.9 });
        }

    } else if (type === 'lava') {
        // Animated lava cracks
        const cracks = [
            [[-12, -20], [-4, -8], [2, -14]],
            [[ 10, -18], [ 5,  0], [14,   6]],
            [[ -8,   4], [-2, 18], [ 6,  12]],
            [[  0, -30], [ 0,  -8]],
        ];

        const crackGraphics = [];
        for (const pts of cracks) {
            const crack = new Graphics();
            body.addChild(crack);
            crackGraphics.push(crack);
        }
        c.cracks = crackGraphics;

        body.circle(0, 0, 12).fill({ color: magmaCol, alpha: 0.18 });

        // Animated fire spikes
        const fireSpikes = [];
        for (let i = 0; i < 5; i++) {
            const spikeData = {
                angle: (i / 5) * Math.PI * 2 - Math.PI / 4,
                height: 16 + (i % 3) * 8,
                rotation: 0,
                speed: 0.03,
                graphics: new Graphics(),
                pulse: 0
            };
            body.addChild(spikeData.graphics);
            fireSpikes.push(spikeData);
        }
        c.fireSpikes = fireSpikes;

        // Eyes
        const leftEye = { x: -11, y: -5, r: 8, graphics: new Graphics() };
        const rightEye = { x: 11, y: -5, r: 8, graphics: new Graphics() };

        body.addChild(leftEye.graphics);
        body.addChild(rightEye.graphics);
        eyes.push(leftEye, rightEye);

        const leftPupil = { x: -11, y: -5, r: 5, graphics: new Graphics() };
        const rightPupil = { x: 11, y: -5, r: 5, graphics: new Graphics() };

        body.addChild(leftPupil.graphics);
        body.addChild(rightPupil.graphics);
        eyes.push(leftPupil, rightPupil);

        const leftCore = { x: -10, y: -6, r: 2, graphics: new Graphics() };
        const rightCore = { x: 12, y: -6, r: 2, graphics: new Graphics() };

        body.addChild(leftCore.graphics);
        body.addChild(rightCore.graphics);
        eyes.push(leftCore, rightCore);

        for (let x = -12; x <= 8; x += 5) {
            body.moveTo(x, 8).lineTo(x + 2.5, 15).lineTo(x + 5, 8).fill({ color: magmaCol, alpha: 0.8 });
        }
        body.circle(0, 0, R).fill({ color: glowCol, alpha: 0.08 });

    } else if (type === 'forest') {
        // Animated leaves
        const leafSizes = [22, 16, 26, 14, 20, 18, 24];
        const leaves = [];

        for (let i = 0; i < 7; i++) {
            const leafData = {
                angle: (i / 7) * Math.PI * 2 - Math.PI / 2,
                height: leafSizes[i],
                rotation: 0,
                speed: 0.015 * (i % 2 === 0 ? 1 : -1),
                graphics: new Graphics()
            };
            body.addChild(leafData.graphics);
            leaves.push(leafData);

            // Inner leaf
            const innerLeaf = {
                angle: (i / 7) * Math.PI * 2 - Math.PI / 2,
                height: leafSizes[i] * 0.7,
                rotation: 0,
                speed: leafData.speed * 0.5,
                graphics: new Graphics()
            };
            body.addChild(innerLeaf.graphics);
            leaves.push(innerLeaf);
        }
        c.leaves = leaves;

        body.rect(-R, 5, R * 2, 8).fill({ color: obsidian, alpha: 0.45 });

        // Eyes
        const leftEye = { x: -11, y: -5, r: 8, graphics: new Graphics() };
        const rightEye = { x: 11, y: -5, r: 8, graphics: new Graphics() };

        body.addChild(leftEye.graphics);
        body.addChild(rightEye.graphics);
        eyes.push(leftEye, rightEye);

        const leftPupil = { x: -11, y: -5, r: 5, graphics: new Graphics() };
        const rightPupil = { x: 11, y: -5, r: 5, graphics: new Graphics() };

        body.addChild(leftPupil.graphics);
        body.addChild(rightPupil.graphics);
        eyes.push(leftPupil, rightPupil);

        const leftCore = { x: -10, y: -7, r: 1.5, graphics: new Graphics() };
        const rightCore = { x: 12, y: -7, r: 1.5, graphics: new Graphics() };

        body.addChild(leftCore.graphics);
        body.addChild(rightCore.graphics);
        eyes.push(leftCore, rightCore);

        for (let x = -9; x <= 9; x += 3) {
            body.circle(x, 11, 1.2).fill({ color: obsidian, alpha: 0.9 });
        }
    }

    c.addChild(body);

    // ── HP Bar
    const hpBg = new Graphics();
    hpBg.rect(-44, -54, 88, 9).fill({ color: 0x111111, alpha: 0.85 });
    c.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-43, -53, 86, 7).fill(glowCol);
    c.addChild(hpBar);

    // Store animation data
    c.animation = {
        type: type,
        time: 0,
        bobOffset: 0,
        originalY: c.y,
        eyes: eyes,
        glowIntensity: 0
    };

    // Initial draw for animated parts
    c.updateAnimations = function(deltaTime = 1) {
        c.animation.time += deltaTime * 0.05;

        // Bobbing motion
        c.animation.bobOffset = Math.sin(c.animation.time) * 3;
        c.y = (c.animation.originalY || 0) + c.animation.bobOffset;

        // Glow pulse
        const pulse = 0.12 + Math.sin(c.animation.time * 2) * 0.04;
        gl.alpha = pulse;

        // Update based on boss type
        if (type === 'ice' && c.spikes) {
            c.spikes.forEach((spike, idx) => {
                spike.rotation += spike.speed * deltaTime;
                spike.graphics.clear();
                const a = spike.angle + spike.rotation;
                const w = 0.12;
                spike.graphics.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                    .lineTo(Math.cos(a) * (R + spike.height), Math.sin(a) * (R + spike.height))
                    .lineTo(Math.cos(a + w) * (R + spike.height * 0.45), Math.sin(a + w) * (R + spike.height * 0.45))
                    .closePath().fill({ color: accentCol, alpha: 0.85 });
            });

            // Animated lines
            if (c.animatedLines) {
                const line1 = c.animatedLines[0];
                const line2 = c.animatedLines[1];
                line1.clear();
                line2.clear();
                const offset = Math.sin(c.animation.time * 3) * 2;
                line1.moveTo(-5 + offset, 4).lineTo(0, -2 + offset).lineTo(6 + offset, 5).stroke({ color: 0xffffff, alpha: 0.4, width: 1 });
                line2.moveTo(-14, 10 + offset).lineTo(-8, 3 + offset).stroke({ color: 0xffffff, alpha: 0.3, width: 1 });
            }
        }

        if (type === 'lava' && c.fireSpikes) {
            c.fireSpikes.forEach((spike) => {
                spike.rotation += spike.speed * deltaTime;
                spike.pulse = Math.sin(c.animation.time * 5 + spike.angle) * 0.2;
                spike.graphics.clear();
                const a = spike.angle + spike.rotation;
                const h = spike.height + spike.pulse * 4;
                spike.graphics.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                    .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                    .lineTo(Math.cos(a + 0.22) * (R + h * 0.4), Math.sin(a + 0.22) * (R + h * 0.4))
                    .closePath().fill({ color: glowCol, alpha: 0.85 + spike.pulse });
            });

            // Animated cracks
            if (c.cracks) {
                c.cracks.forEach((crack, idx) => {
                    crack.clear();
                    const offsets = [
                        [[-12 + Math.sin(c.animation.time) * 2, -20], [-4, -8], [2, -14]],
                        [[10, -18], [5, 0], [14 + Math.cos(c.animation.time) * 2, 6]],
                        [[-8, 4], [-2 + Math.sin(c.animation.time) * 3, 18], [6, 12]],
                        [[0, -30], [0, -8]],
                    ];
                    const pts = offsets[idx];
                    crack.moveTo(...pts[0]);
                    for (let i = 1; i < pts.length; i++) crack.lineTo(...pts[i]);
                    crack.stroke({ color: glowCol, alpha: 0.7 + Math.sin(c.animation.time * 4) * 0.2, width: 2.5 });
                });
            }
        }

        if (type === 'forest' && c.leaves) {
            c.leaves.forEach((leaf, idx) => {
                leaf.rotation += leaf.speed * deltaTime;
                leaf.graphics.clear();
                const a = leaf.angle + leaf.rotation;
                const w = 0.2;
                const h = leaf.height;
                leaf.graphics.moveTo(Math.cos(a) * R, Math.sin(a) * R)
                    .lineTo(Math.cos(a) * (R + h), Math.sin(a) * (R + h))
                    .lineTo(Math.cos(a + w) * (R + h * 0.5), Math.sin(a + w) * (R + h * 0.5))
                    .closePath().fill({ color: accentCol, alpha: 0.92 });
            });
        }

        // Animate eyes (blinking)
        if (c.animation.eyes) {
            const blinkSpeed = 0.03;
            const blinkInterval = 120; // frames between blinks

            c.animation.eyes.forEach(eye => {
                if (eye.blink === undefined) eye.blink = 0;

                if (eye.blink <= 0 && Math.random() < 0.005) {
                    eye.blink = 10; // Blink duration
                }

                if (eye.blink > 0) {
                    eye.blink -= deltaTime;
                    // Blink - hide the eye
                    if (eye.graphics) eye.graphics.clear();
                    if (eye.blink <= 0) {
                        // Redraw eye
                        eye.graphics.clear();
                        if (eye.r === 8 || eye.r === 7) {
                            eye.graphics.circle(eye.x, eye.y, eye.r).fill(0);
                        } else if (eye.r === 5 || eye.r === 4) {
                            eye.graphics.circle(eye.x, eye.y, eye.r).fill(glowCol);
                        } else if (eye.r === 2 || eye.r === 1.5) {
                            eye.graphics.circle(eye.x, eye.y, eye.r).fill(type === 'lava' ? magmaCol : 0xffffff);
                        }
                    }
                }
            });
        }
    };

    return { c, gl, body, hpBar };
}