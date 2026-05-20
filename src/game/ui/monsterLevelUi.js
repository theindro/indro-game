import { Container, Graphics, Text } from 'pixi.js';
import { getMonsterLevel } from '../world/worldProgression.js';

const BADGE_FILL = 0x1a2233;
const BADGE_STROKE = 0x8899bb;
const CONNECTOR = 0x556677;

/** Container for HP / level (not parented to animated body). */
export function getMonsterUiContainer(entity) {
    return entity.uiC ?? entity.c;
}

/**
 * @param {object} entity Mob or boss with .uiC / .c container
 * @param {number} worldDifficulty
 * @param {{ barHalfWidth?: number, barY?: number, barHeight?: number }} [layout]
 */
const ELITE_BADGE_STROKE = {
    burn: 0xf39c12,
    poison: 0x2ecc71,
    freeze: 0x3498db,
};

export function attachMonsterLevelUi(entity, worldDifficulty, layout = {}) {
    const uiRoot = getMonsterUiContainer(entity);
    if (!uiRoot) return;

    const size = entity.size ?? entity.radius ?? 20;
    const barHalfWidth = layout.barHalfWidth ?? size + 2;
    const barY = layout.barY ?? -(size + 14);
    const barHeight = layout.barHeight ?? 3;

    const badgeR = Math.max(9, Math.min(14, size * 0.32));
    const badgeCenterX = -barHalfWidth - badgeR - 5;
    const badgeY = barY + barHeight * 0.5 + 1;

    if (!entity.levelUi) {
        const root = new Container();
        const badgeBg = new Graphics();
        const connector = new Graphics();
        const levelText = new Text({
            text: '',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: Math.max(9, Math.round(badgeR * 0.95)),
                fontWeight: '700',
                fill: 0xe8f0ff,
            },
        });
        levelText.anchor.set(0.5);
        root.addChild(connector);
        root.addChild(badgeBg);
        root.addChild(levelText);
        uiRoot.addChild(root);

        entity.levelUi = {
            root,
            badgeBg,
            connector,
            levelText,
            badgeR,
            badgeCenterX,
            badgeY,
            barHalfWidth,
            barY,
            barHeight,
        };
    }

    entity.worldDifficulty = worldDifficulty;
    entity.monsterLevel = getMonsterLevel(worldDifficulty);
    entity.levelUi.levelText.text = entity.isElite ? `★${entity.monsterLevel}` : String(entity.monsterLevel);

    if (entity.isElite && layout.eliteType) {
        entity.levelUi.badgeStroke = ELITE_BADGE_STROKE[layout.eliteType] ?? 0x9b59b6;
    }
}

/**
 * Draw HP bar + level badge (call each frame health changes).
 * @param {object} entity
 * @param {number} hpPct 0–1
 */
export function drawMonsterHpWithLevel(entity, hpPct) {
    const ui = entity.levelUi;
    const hpBar = entity.hpBar;
    if (!hpBar || !ui) return;

    const {
        badgeBg,
        connector,
        levelText,
        badgeR,
        badgeCenterX,
        badgeY,
        barHalfWidth,
        barY,
        barHeight,
    } = ui;

    const pct = Math.max(0, Math.min(1, hpPct));
    const barFullW = barHalfWidth * 2 + 4;

    badgeBg.clear();
    badgeBg.circle(badgeCenterX, badgeY, badgeR).fill({ color: BADGE_FILL, alpha: 0.92 });
    const strokeCol = ui.badgeStroke ?? BADGE_STROKE;
    badgeBg.circle(badgeCenterX, badgeY, badgeR).stroke({ color: strokeCol, width: 1.5, alpha: 0.9 });

    connector.clear();
    const connX0 = badgeCenterX + badgeR;
    const connX1 = -barHalfWidth - 2;
    connector
        .moveTo(connX0, badgeY)
        .lineTo(connX1, badgeY)
        .stroke({ color: CONNECTOR, width: 2, alpha: 0.85 });

    levelText.position.set(badgeCenterX, badgeY);

    hpBar.clear();
    if (pct > 0) {
        const col =
            pct > 0.5 ? 0x44ff88 :
                pct > 0.25 ? 0xffaa00 :
                    0xff2222;
        hpBar.rect(-barHalfWidth - 2, barY + 1, barFullW * pct, barHeight).fill(col);
    }
}
