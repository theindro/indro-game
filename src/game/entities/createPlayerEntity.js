import { Container, Graphics } from "pixi.js";
import {GlowFilter} from "pixi-filters";

export function createPlayerEntity(world) {
    const pCont = new Container();
    const visual = new Container();
    pCont.addChild(visual);

    // Shadow
    const pShadow = new Graphics();

    pShadow.ellipse(0, 18, 12, 4).fill({ color: 0x000000, alpha: 0.1 });

    pCont.addChild(pShadow);

    const glowFilter = new GlowFilter({
        distance: 12,      // how far glow spreads
        outerStrength: 1,  // glow intensity
        innerStrength: 0.5,
        color: 0x00ddff,   // cyan/void style
        quality: 0.4
    });

    // Soft outer glow
    const pGlow = new Graphics();
    //pGlow.circle(0, 0, 26).fill({ color: 0x00ddff, alpha: 0.22 });
    visual.addChild(pGlow);

    // Main Blob Body (slightly squishy look)
    const pBody = new Graphics();
    pBody.circle(0, -1, 14.5).fill('#67c3ff');              // slightly lighter top highlight for roundness
    visual.addChild(pBody);

    visual.filters = [glowFilter];

    // === CUTE FACE ===

    // Big sparkling eyes
    const leftEye = new Graphics();
    leftEye.circle(-3, -3.5, 3.5).fill(0x112233);
    leftEye.circle(-4, -4, 1).fill(0xffffff);
    visual.addChild(leftEye);

    const rightEye = new Graphics();
    rightEye.circle(6, -3.5, 3.5).fill(0x112233);
    rightEye.circle(5, -4.5, 1).fill(0xffffff);
    visual.addChild(rightEye);

    // 🔴 HP BAR
    const hpBg = new Graphics();
    hpBg.rect(-20, -32, 40, 6).fill({ color: 0x000000, alpha: 0.8 });
    pCont.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-19, -35, 38, 4).fill(0x44ff88);
    pCont.addChild(hpBar);

    // createPlayerEntity.js — add this at the bottom of the function, before return:
    let blinkTimer = 0;
    let blinkInterval = 1000 + Math.random() * 120; // frames between blinks (3-5s at 60fps)
    const BLINK_DUR = 40; // frames the eye stays shut

    function drawEyesOpen(mx, my) {
        // angle from player to mouse
        const angle = Math.atan2(my, mx);
        const dist = 2.2; // how far the pupil shifts
        const ox = Math.cos(angle) * -dist;
        const oy = Math.sin(angle) * -dist;

        leftEye.clear();
        leftEye.circle(-3, -3.5, 3.5).fill(0x112233);
        leftEye.circle(-3 + ox, -3 + oy, 1).fill('rgba(255,255,255,0.9)'); // shifted

        rightEye.clear();
        rightEye.circle(6, -3.5, 3.5).fill(0x112233);
        rightEye.circle(6 + ox, -3.5 + oy, 1).fill('rgba(255,255,255,0.9)'); // shifted
    }

    function tickAnimations(t, mx = 0, my = 0) {
        blinkTimer++;

        const blinking = blinkTimer > blinkInterval;

        leftEye.clear();
        rightEye.clear();

        if (blinking) {
            const raw = (blinkTimer - blinkInterval) / BLINK_DUR;

            if (raw < 1) {
                const lidH = raw < 0.3
                    ? 1 - (raw / 0.3)
                    : (raw - 0.3) / 0.7;

                const h = Math.max(0.05, lidH);
                leftEye.ellipse(-3, -3.5, 3.5, 3.5 * h).fill(0x112233);
                rightEye.ellipse(6, -3.5, 3.5, 3.5 * h).fill(0x112233);
            } else {
                drawEyesOpen(mx, my);
                if (blinkTimer > blinkInterval + BLINK_DUR) {
                    blinkTimer = 0;
                    blinkInterval = 1000 + Math.random() * 120;
                }
            }
        } else {
            drawEyesOpen(mx, my);
        }
    }

    return {
        pCont, pGlow, pBody, pShadow, hpBar,
        leftEye, rightEye,
        tickAnimations, // ← expose this
    };
}