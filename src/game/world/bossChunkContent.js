/**
 * Boss arena spawn + reward chest after defeat (all biomes).
 */
import { spawnBoss } from '../controllers/createBossController.js';
import { getChunkDifficulty } from '../difficultyScaling.js';
import { bindBossHighlightPointer } from '../utils/highlightFilters.js';
import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';

/** @type {Record<string, { displayName: string, chestPropId: string, bannerColor: string }>} */
const BOSS_PROFILE_BY_ID = {
    tree_grove_boss: {
        displayName: 'Grove Tyrant',
        chestPropId: 'grove_boss_chest',
        bannerColor: '#ffaa44',
    },
    sand_titan_arena: {
        displayName: 'Sand Titan',
        chestPropId: 'desert_boss_chest',
        bannerColor: '#e8a050',
    },
    frost_colossus_arena: {
        displayName: 'Frost Colossus',
        chestPropId: 'ice_boss_chest',
        bannerColor: '#88ccff',
    },
    magma_titan_arena: {
        displayName: 'Magma Titan',
        chestPropId: 'lava_boss_chest',
        bannerColor: '#ff6622',
    },
};

/**
 * @param {import('./chunkProfiles.data.js').ChunkLandscapeProfile} profile
 */
function resolveBossProfileMeta(profile) {
    return (
        BOSS_PROFILE_BY_ID[profile?.id] ?? {
            displayName: 'Boss',
            chestPropId: 'grove_boss_chest',
            bannerColor: '#ffaa44',
        }
    );
}

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
        spawnBossRewardChest(world, chunkX, chunkZ, chunkData);
        return;
    }

    spawnArenaBoss(world, chunkX, chunkZ, chunkData);
}

/**
 * @param {import('./OpenWorldManager.js').OpenWorldManager} world
 */
function spawnArenaBoss(world, chunkX, chunkZ, chunkData) {
    const profile = chunkData.landscapeProfile;
    if (!profile?.spawnBoss || chunkData.bossSpawned) return;

    const meta = resolveBossProfileMeta(profile);
    const chunkSizeWorld = world.chunkSize * world.tileSize;
    const cx = chunkX * chunkSizeWorld + chunkSizeWorld * 0.5;
    const cz = chunkZ * chunkSizeWorld + chunkSizeWorld * 0.5;
    const key = `${chunkX},${chunkZ}`;

    const difficulty = chunkData.difficulty ?? getChunkDifficulty(chunkX, chunkZ);

    const boss = spawnBoss(
        world.entityLayer,
        profile.bossType ?? 'forest',
        cx,
        cz,
        profile.bossScale ?? 1.2,
        difficulty
    );

    boss.chunkKey = key;
    boss.arenaProfileId = profile.id;
    boss.spawnCenterX = cx;
    boss.spawnCenterY = cz;
    boss.displayName = meta.displayName;

    boss.onDefeat = () => {
        useGameStore.getState().clearBossEncounter();
        useGameStore.getState().markBossChunkDefeated(key);
        spawnBossRewardChest(world, chunkX, chunkZ, chunkData, cx, cz);
    };

    bindBossHighlightPointer(boss);
    world.entitiesList.bosses.push(boss);

    const entities = world.spawnedEntities.get(key) ?? { mobs: [] };
    entities.boss = boss;
    world.spawnedEntities.set(key, entities);

    chunkData.bossSpawned = true;

    VFX.addFloat(meta.displayName.toUpperCase(), cx, cz - 120, meta.bannerColor);
}

/**
 * @param {import('./OpenWorldManager.js').OpenWorldManager} world
 */
export function spawnBossRewardChest(world, chunkX, chunkZ, chunkData, cx, cz) {
    const profile = chunkData?.landscapeProfile;
    const meta = resolveBossProfileMeta(profile);
    const key = `${chunkX},${chunkZ}`;
    if (world._bossRewardChestKeys?.has(key)) return;

    const chunkSizeWorld = world.chunkSize * world.tileSize;
    const x = cx ?? chunkX * chunkSizeWorld + chunkSizeWorld * 0.5;
    const z = cz ?? chunkZ * chunkSizeWorld + chunkSizeWorld * 0.5;

    const chestId = `${key}_${meta.chestPropId}_${Math.round(x)}_${Math.round(z)}`;
    const opened = useGameStore.getState().openedInteractableIds;
    if (opened.includes(chestId)) return;

    world.interactablePropManager.spawnManualProp(meta.chestPropId, x, z, 1.15, key);

    if (!world._bossRewardChestKeys) world._bossRewardChestKeys = new Set();
    world._bossRewardChestKeys.add(key);
}

/** @deprecated */
export const spawnGroveBossRewardChest = spawnBossRewardChest;
