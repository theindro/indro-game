import { useGameStore } from '../../stores/gameStore.js';
import { VFX } from '../GlobalEffects.js';

/**
 * Full mob death: XP, drops, VFX, archetype cleanup, remove from entities list.
 *
 * @param {object} mob
 * @param {number} [mobIndex]
 * @param {{ entities: { mobs: object[], drops?: object[] }, openWorld: object, spawnDrops?: Function }} deps
 */
export function killMob(mob, mobIndex, deps) {
    const { entities, openWorld, spawnDrops } = deps;
    if (!mob || mob._deathHandled) return;

    let idx = mobIndex;
    if (idx == null || idx < 0 || entities.mobs[idx] !== mob) {
        idx = entities.mobs.indexOf(mob);
    }
    if (idx === -1) return;

    mob._deathHandled = true;
    mob.hp = 0;

    const archetypeBehavior = mob.controller?.archetype;
    if (archetypeBehavior?.destroy) {
        try {
            archetypeBehavior.destroy();
        } catch (err) {
            console.warn('[mob] archetype destroy failed:', err);
        }
    }

    const isElite = mob.type === 'elite';
    const minMobSize = 12;
    const maxMobSize = 40;
    const minScale = 0.2;
    const maxScale = 0.5;
    const scale =
        minScale +
        ((mob.size - minMobSize) / (maxMobSize - minMobSize)) * (maxScale - minScale);

    VFX.explosion(mob.x, mob.y, '', scale, mob.size);

    useGameStore.getState().addKills(1);
    VFX.addFloat(`+${mob.exp} XP`, mob.x, mob.y - 30, 'orange');
    useGameStore.getState().addXP(mob.exp);

    if (spawnDrops) {
        const mobType = isElite ? 'elite' : (mob.biome || 'default');
        const newDrops = spawnDrops(mob.x, mob.y, mobType, false, mob.lootMultiplier ?? 1);
        if (newDrops?.length && entities.drops) {
            entities.drops.push(...newDrops);
        }
    }

    openWorld.totemWaveEvent?.onMobRemoved(mob);

    if (mob.c?.parent) {
        mob.c.parent.removeChild(mob.c);
        mob.c.destroy();
    }

    entities.mobs.splice(idx, 1);
}
