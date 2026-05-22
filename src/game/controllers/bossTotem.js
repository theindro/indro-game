import { Container, Graphics } from 'pixi.js';
import { createEnemyProj } from './createProjectileController.js';
import { ENEMY_RANGED_ORB_SPEED_SCALE, frameScale } from '../constants.js';
import { attachMonsterLevelUi, drawMonsterHpWithLevel } from '../ui/monsterLevelUi.js';
import { VFX } from '../GlobalEffects.js';

const TOTEM_RADIUS = 18;
const TOTEM_SHOOT_INTERVAL = 90;
const MAX_TOTEMS_PER_BOSS = 3;
const CARDINAL_ANGLES = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

/**
 * @param {import('pixi.js').Container} world
 * @param {number} x
 * @param {number} y
 * @param {object} ownerBoss
 * @param {number} difficulty
 */
export function spawnBossTotem(world, x, y, ownerBoss, difficulty = 1) {
    const c = new Container();
    c.x = x;
    c.y = y;
    c.sortableChildren = true;

    const placeholder = new Graphics();
    placeholder.roundRect(-16, -20, 32, 36, 6).fill({ color: 0x5c4033, alpha: 0.95 });
    placeholder.roundRect(-12, -30, 24, 14, 4).fill({ color: 0x8b6914, alpha: 1 });
    placeholder.circle(0, -8, 6).fill({ color: 0xeab47a, alpha: 0.85 });
    c.addChild(placeholder);

    const uiC = new Container();
    c.addChild(uiC);

    const hpBar = new Graphics();
    const hpBg = new Graphics();
    hpBg.rect(-22, -42, 44, 5).fill({ color: 0x111111, alpha: 0.7 });
    uiC.addChild(hpBg);
    uiC.addChild(hpBar);

    world.addChild(c);

    const maxHp = Math.round(55 + difficulty * 28);

    const totem = {
        c,
        uiC,
        hpBar,
        hpBg,
        x,
        y,
        radius: TOTEM_RADIUS,
        hp: maxHp,
        maxHp,
        dead: false,
        owner: ownerBoss,
        shootTimer: TOTEM_SHOOT_INTERVAL * 0.5,
        shootInterval: TOTEM_SHOOT_INTERVAL,
        damage: Math.round(8 + difficulty * 4),
        wobble: Math.random() * Math.PI * 2,
    };

    attachMonsterLevelUi(totem, difficulty, {
        barHalfWidth: 22,
        barY: -42,
        barHeight: 5,
    });

    drawTotemHpBar(totem);

    return totem;
}

/**
 * @param {object} totem
 */
export function drawTotemHpBar(totem) {
    const p = Math.max(0, totem.hp / totem.maxHp);
    if (totem.levelUi) {
        drawMonsterHpWithLevel(totem, p);
        return;
    }
    totem.hpBar.clear();
    if (p > 0) {
        const col = p > 0.5 ? 0x00ff88 : p > 0.25 ? 0xffaa00 : 0xff2222;
        totem.hpBar.rect(-22, -42, 44 * p, 5).fill(col);
    }
}

/**
 * @param {object} totem
 * @param {object[]} enemyProjs
 * @param {import('pixi.js').Container} entityLayer
 */
function shootTotemCardinal(totem, enemyProjs, entityLayer) {
    const reach = 400;
    for (const angle of CARDINAL_ANGLES) {
        const tx = totem.x + Math.cos(angle) * reach;
        const ty = totem.y + Math.sin(angle) * reach;
        const proj = createEnemyProj(
            entityLayer,
            totem.x,
            totem.y,
            tx,
            ty,
            'enemy_orb',
            totem.damage,
            ENEMY_RANGED_ORB_SPEED_SCALE * 0.85,
            7,
            0,
            'normal'
        );
        enemyProjs.push(proj);
    }
}

/**
 * @param {object} totem
 * @param {object[]} totemList
 * @param {number} index
 */
export function destroyBossTotem(totem, totemList, index) {
    totem.dead = true;
    if (totem.c?.parent) totem.c.parent.removeChild(totem.c);
    totem.c?.destroy?.({ children: true });
    if (index >= 0) totemList.splice(index, 1);
}

/**
 * @param {object} boss
 * @param {object[]} totemList
 */
export function destroyBossTotemsForOwner(boss, totemList) {
    for (let i = totemList.length - 1; i >= 0; i--) {
        if (totemList[i].owner === boss) {
            destroyBossTotem(totemList[i], totemList, i);
        }
    }
}

/**
 * @param {number} px
 * @param {number} py
 * @param {object} boss
 * @param {object[]} totemList
 */
export function countBossTotems(boss, totemList) {
    let n = 0;
    for (const t of totemList) {
        if (!t.dead && t.owner === boss) n++;
    }
    return n;
}

/**
 * @param {object} boss
 * @param {number} px
 * @param {number} py
 * @param {object} openWorld
 * @param {object[]} totemList
 * @param {number} difficulty
 * @returns {object | null}
 */
export function trySpawnBossTotemNearPlayer(boss, px, py, openWorld, totemList, difficulty) {
    if (boss.dead) return null;
    if (countBossTotems(boss, totemList) >= MAX_TOTEMS_PER_BOSS) return null;

    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 70;
    let x = px + Math.cos(angle) * dist;
    let y = py + Math.sin(angle) * dist;
    const clamped = openWorld.clampToWorld(x, y, TOTEM_RADIUS);
    x = clamped.x;
    y = clamped.y;

    const totem = spawnBossTotem(openWorld.entityLayer, x, y, boss, difficulty);
    totemList.push(totem);
    VFX.addFloat('Totem!', x, y - 36, '#eab47a', { opacity: 0.9 });
    return totem;
}

/**
 * @param {object[]} totemList
 * @param {number} dt
 * @param {object[]} enemyProjs
 * @param {object} openWorld
 */
export function updateBossTotems(totemList, dt, enemyProjs, openWorld) {
    if (!totemList?.length) return;

    const fs = frameScale(dt);

    for (let i = totemList.length - 1; i >= 0; i--) {
        const t = totemList[i];
        if (t.dead || t.owner?.dead) {
            destroyBossTotem(t, totemList, i);
            continue;
        }

        t.wobble += 0.06 * fs;
        t.c.y = t.y + Math.sin(t.wobble) * 1.5;
        t.c.x = t.x;
        t.c.zIndex = t.y;

        t.shootTimer += fs;
        if (t.shootTimer >= t.shootInterval) {
            t.shootTimer = 0;
            shootTotemCardinal(t, enemyProjs, openWorld.entityLayer);
        }

        drawTotemHpBar(t);
    }
}

export { TOTEM_RADIUS, MAX_TOTEMS_PER_BOSS };
