/**
 * Grove boss arena spawn + reward chest after defeat.
 */
import { spawnBoss } from '../controllers/createBossController.js';
import { bindBossHighlightPointer } from '../utils/highlightFilters.js';
import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';

const BOSS_DISPLAY_NAMES = {
    tree_grove_boss: 'Grove Tyrant',
};

/**
 * @param {import('./OpenWorldManager.js').OpenWorldManager} world
 * @param {number} chunkX
 * @param {number} chunkZ
 * @param {object} chunkData
 */
export function loadBossChunkContent(world, chunkX, chunkZ, chunkData) {
    const key = `${chunkX},${chunkZ}`;
    const defeated = useGameStore.getState().isBossChunkDefeated(key);

    if (defeated) {
        spawnGroveBossRewardChest(world, chunkX, chunkZ);
        return;
    }

    spawnGroveBoss(world, chunkX, chunkZ, chunkData);
}

/**
 * @param {import('./OpenWorldManager.js').OpenWorldManager} world
 */
function spawnGroveBoss(world, chunkX, chunkZ, chunkData) {
    const profile = chunkData.landscapeProfile;
    if (!profile?.spawnBoss || chunkData.bossSpawned) return;

    const chunkSizeWorld = world.chunkSize * world.tileSize;
    const cx = chunkX * chunkSizeWorld + chunkSizeWorld * 0.5;
    const cz = chunkZ * chunkSizeWorld + chunkSizeWorld * 0.5;
    const key = `${chunkX},${chunkZ}`;

    const boss = spawnBoss(
        world.entityLayer,
        profile.bossType ?? 'forest',
        cx,
        cz,
        profile.bossScale ?? 1.2
    );

    boss.chunkKey = key;
    boss.arenaProfileId = profile.id;
    boss.spawnCenterX = cx;
    boss.spawnCenterY = cz;
    boss.displayName = BOSS_DISPLAY_NAMES[profile.id] ?? 'Boss';

    boss.onDefeat = () => {
        useGameStore.getState().clearBossEncounter();
        useGameStore.getState().markBossChunkDefeated(key);
        spawnGroveBossRewardChest(world, chunkX, chunkZ, cx, cz);
    };

    bindBossHighlightPointer(boss);
    world.entitiesList.bosses.push(boss);

    const entities = world.spawnedEntities.get(key) ?? { mobs: [] };
    entities.boss = boss;
    world.spawnedEntities.set(key, entities);

    chunkData.bossSpawned = true;

    VFX.addFloat('GROVE TYRANT', cx, cz - 120, '#ffaa44');
}

/**
 * @param {import('./OpenWorldManager.js').OpenWorldManager} world
 */
export function spawnGroveBossRewardChest(world, chunkX, chunkZ, cx, cz) {
    const key = `${chunkX},${chunkZ}`;
    if (world._bossRewardChestKeys?.has(key)) return;

    const chunkSizeWorld = world.chunkSize * world.tileSize;
    const x = cx ?? chunkX * chunkSizeWorld + chunkSizeWorld * 0.5;
    const z = cz ?? chunkZ * chunkSizeWorld + chunkSizeWorld * 0.5;

    const chestId = `${key}_grove_boss_chest_${Math.round(x)}_${Math.round(z)}`;
    const opened = useGameStore.getState().openedInteractableIds;
    if (opened.includes(chestId)) return;

    world.interactablePropManager.spawnManualProp('grove_boss_chest', x, z, 1.15, key);

    if (!world._bossRewardChestKeys) world._bossRewardChestKeys = new Set();
    world._bossRewardChestKeys.add(key);
}
