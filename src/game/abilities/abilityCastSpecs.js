/** @typedef {'direction' | 'ground' | 'self'} AbilityCastMode */

/** Unified aim preview tint (all abilities). */
export const PREVIEW_COLOR = 0x44ddff;
export const PREVIEW_ACCENT = 0x99eeff;

/**
 * Preview + targeting metadata per ability.
 * @type {Record<string, {
 *   mode: AbilityCastMode,
 *   fillAlpha?: number,
 *   strokeWidth?: number,
 *   useAbilityRadius?: boolean,
 *   useLeapRange?: boolean,
 *   coneSpread?: number,
 *   coneCount?: number,
 *   selfRadius?: number,
 *   instant?: boolean,
 *   hideOrigin?: boolean,
 * }>}
 */
export const ABILITY_CAST_SPECS = {
    ability1: {
        mode: 'direction',
        coneSpread: 0.15,
        coneCount: 10,
    },
    ability2: {
        mode: 'direction',
    },
    ability3: {
        mode: 'self',
        selfRadius: 72,
        instant: true,
    },
    ability4: {
        mode: 'ground',
        hideOrigin: true,
    },
    ability5: {
        mode: 'ground',
        useAbilityRadius: true,
    },
    ability6: {
        mode: 'self',
        selfRadius: 110,
        instant: true,
    },
    ability7: {
        mode: 'ground',
        useAbilityRadius: true,
    },
};

export function getAbilityCastSpec(abilityKey) {
    return ABILITY_CAST_SPECS[abilityKey] ?? { mode: 'direction' };
}

/** Self-buff / no-aim abilities cast immediately on hotkey. */
export function isInstantCastAbility(abilityKey) {
    return !!getAbilityCastSpec(abilityKey).instant;
}
