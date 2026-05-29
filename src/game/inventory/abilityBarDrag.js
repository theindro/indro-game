export const ABILITY_BAR_DRAG_MIME = 'application/x-voidhunt-ability-bar';

let abilityBarDragDepth = 0;

export function beginAbilityBarDragSession() {
    abilityBarDragDepth += 1;
    if (abilityBarDragDepth === 1) {
        document.documentElement.classList.add('ability-bar-dragging');
    }
}

export function endAbilityBarDragSession() {
    abilityBarDragDepth = Math.max(0, abilityBarDragDepth - 1);
    if (abilityBarDragDepth === 0) {
        document.documentElement.classList.remove('ability-bar-dragging');
    }
}

/** @param {DataTransfer | null | undefined} dataTransfer */
export function isAbilityBarDragActive(dataTransfer) {
    if (!dataTransfer?.types) return false;
    const types = [...dataTransfer.types];
    return types.includes(ABILITY_BAR_DRAG_MIME) || types.includes('text/plain');
}

/**
 * @param {number} barIndex 0–5
 * @returns {string}
 */
export function buildAbilityBarDragPayload(barIndex) {
    return JSON.stringify({ source: 'ability_bar', barIndex });
}

/**
 * @param {string} abilityKey
 * @returns {string}
 */
export function buildAbilityPoolDragPayload(abilityKey) {
    return JSON.stringify({ source: 'ability_pool', abilityKey });
}

/**
 * @param {DataTransfer | null | undefined} dataTransfer
 * @returns {{ source: 'ability_bar', barIndex: number } | { source: 'ability_pool', abilityKey: string } | null}
 */
export function parseAbilityBarDragPayload(dataTransfer) {
    if (!dataTransfer) return null;
    try {
        const raw =
            dataTransfer.getData(ABILITY_BAR_DRAG_MIME) ||
            dataTransfer.getData('text/plain');
        if (!raw) return null;
        const parsed = JSON.parse(raw);

        if (parsed?.source === 'ability_bar') {
            const barIndex = Number(parsed?.barIndex);
            if (Number.isInteger(barIndex) && barIndex >= 0 && barIndex < 6) {
                return { source: 'ability_bar', barIndex };
            }
        }

        if (parsed?.source === 'ability_pool' && typeof parsed.abilityKey === 'string') {
            return { source: 'ability_pool', abilityKey: parsed.abilityKey };
        }
    } catch {
        return null;
    }
    return null;
}
