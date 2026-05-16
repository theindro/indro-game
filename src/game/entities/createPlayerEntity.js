import {Container, Graphics, Sprite} from "pixi.js";
import {GlowFilter} from "pixi-filters";
import {assetManager} from "../utils/assetManager.js";
import {useGameStore} from "../../stores/gameStore.js";
import {ItemDatabase} from "../items.js";

function hexToGlowColor(hex) {
    if (!hex) return 0xffffff;
    return parseInt(String(hex).replace("#", ""), 16) || 0xffffff;
}

/** Glow filter tinted to item rarity (no glow for Common). */
function createWeaponRarityGlow(rarity) {
    if (!rarity || rarity.name === "Common") return null;

    const strengthByName = {
        Magic: 1.15,
        Rare: 1.3,
        Epic: 1.5,
        Legendary: 1.75,
    };
    const scale = strengthByName[rarity.name] ?? 1.1;

    return new GlowFilter({
        distance: 14,
        outerStrength: 1.25 * scale,
        innerStrength: 0.85 * scale,
        color: hexToGlowColor(rarity.color),
        quality: 0.45,
    });
}

export function createPlayerEntity(world) {
    const pCont = new Container();
    const visual = new Container();
    pCont.addChild(visual);

    // Shadow
    const pShadow = new Graphics();
    pShadow.ellipse(0, 18, 12, 4).fill({color: 0x000000, alpha: 0.1});
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

    const empowerAura = new Graphics();
    empowerAura.visible = false;
    empowerAura.eventMode = 'none';
    pCont.addChildAt(empowerAura, 0);

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
    let currentWeaponKey = null;

    function updateWeaponSprite() {
        const equipment = useGameStore.getState().inventory.equipment;
        const weapon = equipment?.weapon;
        const weaponKey = weapon?.id ?? null;

        if (weaponKey === currentWeaponKey) return;
        currentWeaponKey = weaponKey;

        if (weaponSprite) {
            weaponContainer.removeChild(weaponSprite);
            weaponSprite.destroy();
            weaponSprite = null;
        }
        if (!weapon?.id) return;

        const dbItem = ItemDatabase[weapon.id];
        const textureId = dbItem?.textureId ?? weapon.id;
        const texture = assetManager.resolveTexture(textureId);
        if (!texture) {
            console.warn(`[player] Missing weapon texture: ${textureId} (${weapon.id})`);
            return;
        }

        weaponSprite = new Sprite(texture);
        weaponSprite.anchor.set(0.5, 0.5);
        weaponSprite.scale.set(0.1);

        const rarityGlow = createWeaponRarityGlow(dbItem?.rarity);
        weaponSprite.filters = rarityGlow ? [rarityGlow] : null;

        weaponContainer.addChild(weaponSprite);
    }

    // HP Bar
    const hpBg = new Graphics();
    hpBg.rect(-20, -32, 40, 6).fill({color: 0x000000, alpha: 0.8});
    pCont.addChild(hpBg);

    const hpBar = new Graphics();
    hpBar.rect(-19, -35, 38, 4).fill(0x44ff88);
    pCont.addChild(hpBar);

    let blinkTimer = 0;
    let blinkInterval = 1000 + Math.random() * 120;
    let shootAnim = 0;
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

    function drawEmpowerAura(phase) {
        const active = performance.now() < (useGameStore.getState().empowerBuff?.endsAt ?? 0);
        if (!active) {
            if (empowerAura.visible) {
                empowerAura.visible = false;
                empowerAura.clear();
            }
            return;
        }

        empowerAura.visible = true;
        empowerAura.clear();

        const pulse = 0.9 + Math.sin(phase * 10) * 0.12;
        const r = 20 * pulse;

        empowerAura.circle(0, 2, r * 1.15).fill({ color: 0xff3300, alpha: 0.07 });
        empowerAura.circle(0, 2, r).fill({ color: 0xff5500, alpha: 0.14 });
        empowerAura.circle(0, 2, r * 0.55).fill({ color: 0xffaa44, alpha: 0.1 });
        empowerAura.circle(0, 2, r).stroke({ color: 0xff8800, width: 1.5, alpha: 0.35 + Math.sin(phase * 14) * 0.15 });

        for (let i = 0; i < 6; i++) {
            const a = phase * 4 + (i / 6) * Math.PI * 2;
            const fx = Math.cos(a) * r * 0.75;
            const fy = Math.sin(a) * r * 0.45 + 2;
            empowerAura.circle(fx, fy, 2 + Math.sin(phase * 8 + i) * 0.6)
                .fill({ color: 0xff6600, alpha: 0.35 + Math.sin(phase * 6 + i) * 0.2 });
        }
    }

    function tickAnimations(t, mx = 0, my = 0) {
        drawEmpowerAura(t);
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
        updateWeaponSprite();

        if (weaponSprite) {
            const angle = Math.atan2(my, mx);

            const radius = 16;

            // recoil animation
            if (shootAnim > 0) {
                shootAnim -= 0.10;

                const recoil = shootAnim * 6;

                weaponContainer.x = Math.cos(angle) * (radius - recoil);
                weaponContainer.y = Math.sin(angle) * (radius - recoil) - 2;

                weaponSprite.rotation = angle + Math.PI - shootAnim * 0.25;
            } else {
                weaponContainer.x = Math.cos(angle) * radius;
                weaponContainer.y = Math.sin(angle) * radius - 2;

                weaponSprite.rotation = angle + Math.PI;
            }

            const facingLeft = mx < 0;

            weaponSprite.scale.set(
                0.1,
                facingLeft ? -0.1 : 0.1
            );
        }
    }

    function playWeaponShoot() {
        shootAnim = 1.5;
    }

    return {
        pCont, pGlow, pBody, pShadow, hpBar, hpBg,
        leftEye, rightEye,
        tickAnimations, playWeaponShoot
    };
}