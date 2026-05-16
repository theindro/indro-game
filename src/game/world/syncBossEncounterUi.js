import { useGameStore } from '../../stores/gameStore.js';

/**
 * Keeps the React boss HP bar in sync with the player's current boss arena chunk.
 * @param {import('./OpenWorldManager.js').OpenWorldManager} openWorld
 * @param {number} px
 * @param {number} py
 */
export function syncBossEncounterUi(openWorld, px, py) {
    const chunkSizeWorld = openWorld.chunkSize * openWorld.tileSize;
    const cx = Math.floor(px / chunkSizeWorld);
    const cz = Math.floor(py / chunkSizeWorld);
    const key = `${cx},${cz}`;
    const chunkData = openWorld.chunkData.get(key);
    const entities = openWorld.spawnedEntities.get(key);
    const boss = entities?.boss;

    if (
        boss &&
        !boss.dead &&
        boss.hp > 0 &&
        chunkData?.landscapeProfile?.spawnBoss
    ) {
        useGameStore.getState().setBossEncounter({
            name: boss.displayName ?? 'Boss',
            hp: boss.hp,
            maxHp: boss.maxHp,
        });
        return;
    }

    if (useGameStore.getState().bossEncounter) {
        useGameStore.getState().clearBossEncounter();
    }
}
