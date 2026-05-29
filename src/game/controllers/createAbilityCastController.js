import { useGameStore } from '../../stores/gameStore.js';
import { isInstantCastAbility } from '../abilities/abilityCastSpecs.js';
import { resolveAbilityCastTarget } from '../abilities/abilityTargeting.js';
import { createAbilityCastPreview } from './abilityCastPreview.js';

/**
 * League-style casting: preview + LMB confirm / RMB cancel.
 * Instant-cast abilities (e.g. Empower) fire on hotkey with no preview.
 */
export function createAbilityCastController({
    combat,
    input,
    openWorld,
    colliders,
    getMouseWorld,
    getPlayerPos,
}) {
    /** @type {{ abilityKey: string } | null} */
    let pending = null;

    const preview = createAbilityCastPreview(openWorld.entityLayer);

    function hasPendingCast() {
        return pending != null;
    }

    function canStartCast(abilityKey) {
        const store = useGameStore.getState();
        if (!store.skillUnlocks?.[abilityKey]) return false;
        const ability = store.abilities?.[abilityKey];
        if (!ability) return false;
        return performance.now() >= (ability.cooldownEnd ?? 0);
    }

    function cancelPending() {
        pending = null;
        preview.clear();
        input.notifyAimEnded();
    }

    function castImmediately(abilityKey, px, py) {
        if (!canStartCast(abilityKey)) return false;

        const store = useGameStore.getState();
        const ability = store.abilities?.[abilityKey];
        if (!ability) return false;

        const cursor = getMouseWorld();
        const target = resolveAbilityCastTarget(
            abilityKey,
            px,
            py,
            cursor.x,
            cursor.y,
            ability,
            { openWorld, colliders }
        );

        return combat.useAbilityByKey(abilityKey, target.x, target.y);
    }

    /**
     * @param {number} barIndex 0–5
     */
    function onAbilityHotkey(barIndex) {
        const abilityKey = combat.getAbilityKeyAtBarSlot(barIndex);
        if (!abilityKey || !combat.isAbilityUnlockedAtBarSlot(barIndex)) return;

        const { x: px, y: py } = getPlayerPos();

        if (isInstantCastAbility(abilityKey)) {
            cancelPending();
            castImmediately(abilityKey, px, py);
            return;
        }

        if (pending?.abilityKey === abilityKey) {
            cancelPending();
            return;
        }

        if (!canStartCast(abilityKey)) return;

        pending = { abilityKey };
    }

    function confirmPending(px, py) {
        if (!pending) return false;

        const abilityKey = pending.abilityKey;
        if (!canStartCast(abilityKey)) {
            cancelPending();
            return false;
        }

        const ok = castImmediately(abilityKey, px, py);
        pending = null;
        preview.clear();
        input.notifyAimEnded();
        return ok;
    }

    /**
     * @param {number} px
     * @param {number} py
     */
    function tick(px, py) {
        if (!pending) return;

        const store = useGameStore.getState();
        const ability = store.abilities?.[pending.abilityKey];
        if (!ability || !canStartCast(pending.abilityKey)) {
            cancelPending();
            return;
        }

        const cursor = getMouseWorld();
        preview.draw(
            pending.abilityKey,
            px,
            py,
            cursor.x,
            cursor.y,
            ability,
            { openWorld, colliders }
        );

        if (input.consumeMousePress(0)) {
            confirmPending(px, py);
        }
        if (input.consumeMousePress(2)) {
            cancelPending();
        }
    }

    function onEscape() {
        cancelPending();
    }

    function destroy() {
        cancelPending();
        preview.destroy();
    }

    return {
        onAbilityHotkey,
        tick,
        confirmPending,
        cancelPending,
        onEscape,
        hasPendingCast,
        destroy,
    };
}
