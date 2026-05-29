/** Display metadata for player buffs / debuffs (HUD + tooltips). */

/** @typedef {'buff' | 'debuff'} StatusKind */

/**
 * @type {Record<string, {
 *   name: string,
 *   description: string,
 *   icon: string,
 *   kind: StatusKind,
 * }>}
 */
export const PLAYER_BUFF_DEFS = {
    empower: {
        name: 'Empower',
        description: 'Your arrows ignite enemies on hit (burn damage over time).',
        icon: '/icons/ability3.png',
        kind: 'buff',
    },
};

/**
 * @type {Record<string, {
 *   name: string,
 *   description: string,
 *   icon: string,
 *   kind: StatusKind,
 * }>}
 */
export const PLAYER_DEBUFF_DEFS = {
    burn: {
        name: 'Burning',
        description: 'Taking fire damage over time from an elite attack.',
        icon: '/icons/ability7.png',
        kind: 'debuff',
    },
    poison: {
        name: 'Poisoned',
        description: 'Taking poison damage over time from an elite attack.',
        icon: '/icons/ability5.png',
        kind: 'debuff',
    },
    freeze: {
        name: 'Chilled',
        description: 'Movement slowed by frost from an elite attack.',
        icon: '/icons/ability4.png',
        kind: 'debuff',
    },
    stun: {
        name: 'Stunned',
        description: 'Cannot move (boss charge impact).',
        icon: '/icons/dash.png',
        kind: 'debuff',
    },
};
