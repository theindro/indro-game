import { Container, Graphics, Sprite } from "pixi.js";
import { GlowFilter } from "pixi-filters";
import { assetManager } from "../utils/assetManager.js";
import { useGameStore } from "../../stores/gameStore.js";

export function createPlayerEntity(world) {
    const pCont = new Container();
    const visual = new Container();
    pCont.addChild(visual);

    // Shadow
    const pShadow = new Graphics();
    pShadow.ellipse(0, 18, 12, 4).fill({ color: 0x000000, alpha: 0.1 });
    pCont.addChild(pShadow);

    const glowFilter = new GlowFilter({
        distance: 12,
        outerStrength: 1,
        innerStrength: 0.5,
        color: 0x00ddff,
        quality: 0.4
    });

    const pGlow = new Graphics();
    visual.addChild(pGlow);

    const pBody = new Graphics();
    pBody.circle(0, -1, 14.5).fill('#67c3ff');
    visual.addChild(pBody);

    visual.filters = [glowFilter];

    const leftEye = new Graphics();
    leftEye.circle(-3, -3.5, 3.5).fill(0x112233);
    leftEye.circle(-4, -4, 1).fill(0xffffff);
    visual.addChild(leftEye);

    const rightEye = new Graphics();
    rightEye.circle(6, -3.5, 3.5).fill(0x112233);
    rightEye.circle(5, -4.5, 1).fill(0xffffff);
    visual.addChild(rightEye);

    // ── Weapon holder ────────────────────────────────────
    // Sits outside `visual` so it doesn't get the glow filter
    const weaponContainer = new Container();
    weaponContainer.x = 0;
    weaponContainer.y = 0;
    pCont.addChild(weaponContainer);

    let weaponSprite = null;
    let currentWeaponId = null;

    function updateWeaponSprite() {
        const equipment = useGameStore.getState().inventory.equipment;
        const weapon = equipment?.weapon;

        // No change needed
        if (weapon?.id === currentWeaponId) return;
        currentWeaponId = weapon?.id ?? null;

        // Clear old sprite
        if (weaponSprite) {
            weaponContainer.removeChild(weaponSprite);
            weaponSprite.destroy();
            weaponSprite = null;
        }

        if (!weapon) return;

        const texture = assetManager.getTexture(weapon.textureId);
        if (!texture) return;

        weaponSprite = new Sprite(texture);
        weaponSprite.anchor.set(0.1, 0.5); // pivot near handle
        weaponSprite.scale.set(0.08);

        weaponContainer.addChild(weaponSprite);
    }

    // HP Bar
    const hpBg = new Graphics();
    hpBg.rect(-20, -32, 40, 6).fill({ color: 0x000000, alpha: 0.8 });
    pCont.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-19, -35, 38, 4).fill(0x44ff88);
    pCont.addChild(hpBar);

    let blinkTimer = 0;
    let blinkInterval = 1000 + Math.random() * 120;
    const BLINK_DUR = 40;

    function drawEyesOpen(mx, my) {
        const angle = Math.atan2(my, mx);
        const dist = 2.2;
        const ox = Math.cos(angle) * -dist;
        const oy = Math.sin(angle) * -dist;

        leftEye.clear();
        leftEye.circle(-3, -3.5, 3.5).fill(0x112233);
        leftEye.circle(-3 + ox, -3 + oy, 1).fill('rgba(255,255,255,0.9)');

        rightEye.clear();
        rightEye.circle(6, -3.5, 3.5).fill(0x112233);
        rightEye.circle(6 + ox, -3.5 + oy, 1).fill('rgba(255,255,255,0.9)');
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

        // ── Update weapon each tick ──────────────────────
        //updateWeaponSprite();

        if (weaponSprite) {
            const angle = Math.atan2(my, mx);
            const radius = 16;
            weaponContainer.x = Math.cos(angle) * radius;
            weaponContainer.y = Math.sin(angle) * radius - 2;

            const flipped = false;

            weaponSprite.scale.y = flipped ? -0.14 : 0.1;
            weaponSprite.rotation = flipped
                ? -(angle + Math.PI * 0.75)  // negate the whole thing when flipped
                : angle + Math.PI * 0.75;
        }
    }

    return {
        pCont, pGlow, pBody, pShadow, hpBar,
        leftEye, rightEye,
        tickAnimations,
    };
}