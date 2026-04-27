// controllers/createCombatController.js
import { createArrow } from './createProjectileController.js';
import { useGameStore } from "../../stores/gameStore.js";
import { createDropSystem } from "./subsystems/createDropSystem.js";
import { createArrowSystem } from "./subsystems/createArrowSystem.js";
import { createProjectileSystem } from "./subsystems/createProjectileSystem.js";
import { useArrowBarrage } from "../abilities/ArrowBarrage.js";
import { useRapidFire } from "../abilities/RapidFire.js";
import { useFrostArrow } from "../abilities/FrostArrow.js";

export function createCombatController(ctx) {
    const { world, entities, openWorld, colliders } = ctx;
    const { mobs, bosses, arrows, drops, enemyProjs } = entities;
    const { x, y } = useGameStore.getState().player;
    const entityLayer = openWorld.entityLayer;

    // Create drop system first (so we can pass its spawnDrops to arrow system)
    const dropSystem = createDropSystem({
        world,
        entityLayer,
        drops
    });

    // Create arrow system with spawnDrops callback
    const arrowSystem = createArrowSystem({
        world,
        entities,
        openWorld,
        colliders,
        spawnDrops: dropSystem.spawnDrops  // Pass the spawn function
    });

    const projectileSystem = createProjectileSystem({
        entityLayer,
        entities,
        openWorld,
        colliders,
        enemyProjs
    });

    // Shooting
    function tryShoot(px, py, tx, ty) {
        const stats = useGameStore.getState().player.stats;

        for (let i = 0; i < stats.projectiles; i++) {
            const spread = (i - (stats.projectiles - 1) / 2) * 0.12;

            const chainData = {
                chainRemaining: stats.chainEnabled ? stats.chainCount : 0,
                chainHitMobs: new Set(),
                damage: stats.damage,
                chainRange: stats.chainRange,
                chainDamageMultiplier: stats.chainDamage
            };

            arrows.push(createArrow(entityLayer, px, py, tx, ty, spread, chainData));
        }
    }

    // Ability wrappers
    function useArrowBarrageWrapper(targetX, targetY) {
        const abilityCtx = { ...ctx, arrows };

        return useArrowBarrage(abilityCtx, targetX, targetY);
    }

    function useRapidFireWrapper(targetX, targetY) {
        const abilityCtx = { ...ctx, arrows };

        return useRapidFire(abilityCtx, targetX, targetY);
    }

    function useFrostArrowWrapper(targetX, targetY) {
        const abilityCtx = { ...ctx, arrows, mobs, bosses };

        return useFrostArrow(abilityCtx, targetX, targetY);
    }

    return {
        tryShoot,
        updateArrows: arrowSystem.updateArrows,
        updateEnemyProjs: projectileSystem.updateEnemyProjs,
        updateDrops: dropSystem.updateDrops,
        spawnDrops: dropSystem.spawnDrops,  // Used when mobs die
        useArrowBarrage: useArrowBarrageWrapper,
        useRapidFire: useRapidFireWrapper,
        useFrostArrow: useFrostArrowWrapper
    };
}