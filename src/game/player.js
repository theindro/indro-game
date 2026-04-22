import { Container, Graphics } from 'pixi.js';
import { XP_NEXT_MULTIPLIER, HP_PER_LEVEL } from './constants.js';

export function createPlayerEntity(world) {
    const pCont   = new Container();

    const pShadow = new Graphics();
    pShadow.ellipse(0, 15, 13, 5).fill({ color: 0, alpha: 0.28 });
    pCont.addChild(pShadow);

    const pGlow = new Graphics();
    pGlow.circle(0, 0, 22).fill({ color: 0x9b30ff, alpha: 0.18 });
    pCont.addChild(pGlow);

    const pBody = new Graphics();
    pBody.circle(0, 0, 14).fill(0x7209b7);
    pBody.circle(-4, -4, 5).fill({ color: 0xb86dff, alpha: 0.35 });
    pCont.addChild(pBody);

    const pRune = new Graphics();
    pRune.moveTo(0, -8).lineTo(5, 5).lineTo(-5, 5).closePath()
        .fill({ color: 0xe0aaff, alpha: 0.7 });
    pCont.addChild(pRune);

    // 🔴 HP BAR BACKGROUND
    const hpBg = new Graphics();
    hpBg.rect(-20, -32, 40, 6).fill({ color: 0x000000, alpha: 0.7 });
    pCont.addChild(hpBg);

    // 🔴 HP BAR FILL
    const hpBar = new Graphics();
    hpBar.rect(-19, -31, 38, 4).fill(0x44ff88);
    pCont.addChild(hpBar);

    world.addChild(pCont);

    return { pCont, pGlow, pBody, pRune, pShadow, hpBar };
}

export function updatePlayerHPBar(hpBar, hp, maxHp) {
    const pct = Math.max(0, hp / maxHp);

    hpBar.clear();

    if (pct > 0) {
        const color =
            pct > 0.5 ? 0x44ff88 :
                pct > 0.25 ? 0xffaa00 :
                    0xff2222;

        hpBar
            .rect(-19, -31, 38 * pct, 4)
            .fill(color);
    }
}

/**
 * Creates an XP/levelling system bound to the player's mutable state object.
 * @param {object} playerState  - { pXP, pLevel, pXPNext, pMaxHP, pHP, stats }
 * @param {object} deps         - { burst, world, particles, levelupEl, shakeRef }
 */
export function createXPSystem(playerState, deps) {
    return {
        addXP(amt) {
            const s = playerState;
            s.pXP += amt;
            if (s.pXP >= s.pXPNext) {
                s.pLevel++;
                s.pXP = 0;
                s.pXPNext = Math.floor(s.pXPNext * XP_NEXT_MULTIPLIER);
                s.pMaxHP += HP_PER_LEVEL;
                s.pHP = s.pMaxHP;

                s.stats.damage += 3;
                if (s.pLevel % 2 === 0) s.stats.attackSpeed = Math.max(12, s.stats.attackSpeed - 3);
                if (s.pLevel % 3 === 0) s.stats.projectiles += 1;
                if (s.pLevel % 4 === 0) s.stats.moveSpeed += 0.05;

                deps.burst(deps.world, deps.particles, s.px, s.py, 0xffd700, 25, 4);
                deps.shakeRef.value = 6;

                deps.levelupEl.style.opacity = '1';
                setTimeout(() => { deps.levelupEl.style.opacity = '0'; }, 1400);
            }
        }
    };
}