import { Container, Graphics, Text } from 'pixi.js';
import { getMonsterLevel } from '../world/worldProgression.js';

const BADGE_FILL = "rgb(64, 58, 52)";
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
        const levelText = new Text({
            text: '',
            style: {
                fontSize: Math.max(9, Math.round(badgeR * 0.95)),
                fontWeight: '700',
                fill: 0xe8f0ff,
            },
        });
        levelText.anchor.set(0.5);
        root.addChild(badgeBg);
        root.addChild(levelText);
        uiRoot.addChild(root);

        entity.levelUi = {
            root,
            badgeBg,
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
    entity.levelUi.levelText.text = entity.isElite ? `★` : String(entity.monsterLevel);

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
        levelText,
        barHalfWidth,
        barY,
        barHeight,
    } = ui;

    const pct = Math.max(0, Math.min(1, hpPct));

    // LEVEL BOX
    const badgeW = 16;
    const badgeH = 16;
    const badgeX = -barHalfWidth - badgeW + 1;
    const badgeY = barY - 6;

    badgeBg.clear();

    badgeBg
        .roundRect(badgeX, badgeY, badgeW, badgeH, 2)
        .fill({ color: BADGE_FILL, alpha: 0.95 });

    badgeBg
        .roundRect(badgeX, badgeY, badgeW, badgeH, 2)
        .stroke({
            color: BADGE_STROKE,
            width: 1,
            alpha: 0.8,
        });

    levelText.position.set(
        badgeX + badgeW * 0.5,
        badgeY + badgeH * 0.5
    );

    // HP BAR
    hpBar.clear();

    // background
    hpBar
        .roundRect(-barHalfWidth, barY, barHalfWidth * 2, barHeight, 2)
        .fill(0x1a1a1a);

    // fill
    if (pct > 0) {
        const col = entity.isElite ? "#9422fe" : "#c90f0f";

        hpBar
            .roundRect(
                -barHalfWidth,
                barY,
                barHalfWidth * 2 * pct,
                barHeight + 1,
                2
            )
            .fill(col);
    }
}