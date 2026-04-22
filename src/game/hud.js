import { getBiome, BIOME_DISPLAY } from './biome.js';

let _lastBiome = 'forest';

/**
 * @typedef HUDElements
 * @property {HTMLElement} hpFill
 * @property {HTMLElement} hpLabel
 * @property {HTMLElement} xpFill
 * @property {HTMLElement} levelBadge
 * @property {HTMLElement} killsEl
 * @property {HTMLElement} biomeEl
 * @property {HTMLElement} bossPanelEl
 * @property {HTMLElement} bossNameEl
 * @property {HTMLElement} bossFillEl
 */

/**
 * Refresh all HUD elements.
 * @param {HUDElements} els
 * @param {object} state
 */
export function updateHUD(els, state) {
    const { hpFill, hpLabel, xpFill, levelBadge, biomeEl, bossFillEl, goldEl } = els;
    const { gold, pHP, pMaxHP, pXP, pXPNext, pLevel, activeBoss } = state;

    if (hpFill) hpFill.style.width = Math.max(0, pHP / pMaxHP) * 100 + '%';
    if (hpLabel) hpLabel.textContent = `${Math.max(0, Math.ceil(pHP))} / ${pMaxHP}`;

    if (hpFill) {
        const hpPct = Math.max(0, pHP / pMaxHP) * 100;
        hpFill.style.background =
            hpPct > 50 ? 'linear-gradient(90deg,#c0003c,#ff6b8a)'
                : hpPct > 25 ? 'linear-gradient(90deg,#7b3a00,#ff8800)'
                    : 'linear-gradient(90deg,#6b0000,#ff2222)';
    }

    if (xpFill) xpFill.style.width = (pXP / pXPNext * 100) + '%';
    if (levelBadge) levelBadge.textContent = `Level ${pLevel}`;
    if (goldEl) goldEl.textContent = gold ?? 0;

    const cb = state?.currentRoom?.biome || '';
    if (cb && cb !== _lastBiome && biomeEl && BIOME_DISPLAY[cb]) {
        _lastBiome = cb;
        const { label, color } = BIOME_DISPLAY[cb];
        biomeEl.textContent      = label;
        biomeEl.style.color      = color;
        biomeEl.style.textShadow = `0 0 12px ${color}`;
    }

    if (activeBoss && !activeBoss.dead && bossFillEl) {
        bossFillEl.style.width = (Math.max(0, activeBoss.hp) / activeBoss.maxHp * 100) + '%';
    }
}

/** Call when a boss is first spawned or changes. */
export function showBossPanel(els, boss) {
    els.bossPanelEl.classList.add('visible');
    els.bossWarningEl.classList.add('visible');

    setTimeout(() => {
        els.bossWarningEl.classList.remove('visible');
    }, 2000)

    const BOSSNAMES = {
        desert: 'SAND COLOSSUS',
        ice: 'FROST WRAITH',
        forest: 'NATURE BOI',
        lava: 'DOOM',
    }

    els.bossNameEl.textContent = BOSSNAMES[boss.type];
}

/** Call when all bosses are dead. */
export function hideBossPanel(els) {
    els.bossPanelEl.classList.remove('visible');
}
