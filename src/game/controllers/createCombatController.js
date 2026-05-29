// controllers/createCombatController.js
import { createArrow, ARROW_TYPES } from './createProjectileController.js';
import { DEFAULT_ATTACK_RANGE } from '../constants.js';
import { useGameStore } from "../../stores/gameStore.js";
import { createDropSystem } from "./subsystems/createDropSystem.js";
import { createArrowSystem } from "./subsystems/createArrowSystem.js";
import { createProjectileSystem } from "./subsystems/createProjectileSystem.js";
import { useArrowBarrage } from "../abilities/ArrowBarrage.js";
import { useRapidFire } from "../abilities/RapidFire.js";
import { useFrostArrow } from "../abilities/FrostArrow.js";
import { useVenomNova } from "../abilities/VenomNova.js";
import { useSpinshot, updateSpinshot } from "../abilities/Spinshot.js";
import { useEmpower } from "../abilities/Empower.js";
import { useFireSlam } from "../abilities/FireSlam.js";
import { getEmpoweredArrowType } from "../abilities/empowerBuff.js";
import {audioManager} from "../utils/audioManager.js";

export function createCombatController(ctx) {
    const { world, entities, openWorld, colliders, playWeaponShoot } = ctx;
    const { arrows, drops, enemyProjs } = entities;
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

            audioManager.playSFX('/sounds/arrowshoot.mp3', 0.85);

            playWeaponShoot();

            const tr = {
                maxRange: stats.attackRange ?? DEFAULT_ATTACK_RANGE,
                speedScale: stats.projectileSpeed ?? 1,
            };
            const arrow = createArrow(
                entityLayer,
                px,
                py,
                tx,
                ty,
                spread,
                chainData,
                getEmpoweredArrowType(),
                tr
            );
            arrow.pierceRemaining = stats.pierceCount ?? 0;
            arrows.push(arrow);
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
        const abilityCtx = {
            ...ctx,
            arrows,
            mobs: entities.mobs,
            bosses: entities.bosses
        };

        return useFrostArrow(abilityCtx, targetX, targetY);
    }

    function useEmpowerWrapper() {
        return useEmpower();
    }

    function useVenomNovaWrapper(targetX, targetY) {
        return useVenomNova({ ...ctx, entities }, targetX, targetY);
    }

    function useSpinshotWrapper() {
        return useSpinshot({ ...ctx, arrows });
    }

    function useFireSlamWrapper(targetX, targetY) {
        return useFireSlam({ ...ctx, entities }, targetX, targetY);
    }

    function getAbilityKeyAtBarSlot(barIndex) {
        const layout = useGameStore.getState().abilityBarLayout;
        const key = layout?.[barIndex];
        return key || null;
    }

    function isAbilityUnlockedAtBarSlot(barIndex) {
        const key = getAbilityKeyAtBarSlot(barIndex);
        if (!key) return false;
        return !!useGameStore.getState().skillUnlocks?.[key];
    }

    /** @deprecated use isAbilityUnlockedAtBarSlot */
    function isAbilityUnlocked(num) {
        return isAbilityUnlockedAtBarSlot(num - 1);
    }

    function useAbilityByKey(abilityKey, targetX, targetY) {
        if (!abilityKey) return false;
        switch (abilityKey) {
            case 'ability1':
                return useArrowBarrageWrapper(targetX, targetY);
            case 'ability2':
                return useRapidFireWrapper(targetX, targetY);
            case 'ability3':
                return useEmpowerWrapper();
            case 'ability4':
                return useFrostArrowWrapper(targetX, targetY);
            case 'ability5':
                return useVenomNovaWrapper(targetX, targetY);
            case 'ability6':
                return useSpinshotWrapper();
            case 'ability7':
                return useFireSlamWrapper(targetX, targetY);
            default:
                return false;
        }
    }

    return {
        tryShoot,
        killMob: arrowSystem.killMob,
        isAbilityUnlocked,
        isAbilityUnlockedAtBarSlot,
        useAbilityByKey,
        getAbilityKeyAtBarSlot,
        updateArrows: arrowSystem.updateArrows,
        updateEnemyProjs: projectileSystem.updateEnemyProjs,
        updateDrops: dropSystem.updateDrops,
        spawnDrops: dropSystem.spawnDrops,
        spawnPlayerDrop: dropSystem.spawnPlayerDrop,
        grantLootEntries: dropSystem.grantLootEntries,
        spawnLootToGround: dropSystem.spawnLootToGround,
        useArrowBarrage: useArrowBarrageWrapper,
        useRapidFire: useRapidFireWrapper,
        useFrostArrow: useFrostArrowWrapper,
        useVenomNova: useVenomNovaWrapper,
        useSpinshot: useSpinshotWrapper,
        updateSpinshot,
        useEmpower: useEmpowerWrapper,
    };
}