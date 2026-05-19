/** @typedef {'marksmanship'|'chain'|'elemental'|'abilities'} SkillBranch */

/**
 * @typedef {object} SkillNodeEffect
 * @property {'stat'} [type]
 * @property {string} [stat]
 * @property {number} [perRank]
 * @property {'ability'} [type]
 * @property {string} [abilityKey]
 * @property {string} [field]
 * @property {'unlock'} [type]
 * @property {string} [unlockAbility]
 */

/**
 * @typedef {object} SkillNodeDef
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {SkillBranch} branch
 * @property {number} tier Row (1 = top / entry)
 * @property {number} column Position in row
 * @property {number} maxRank
 * @property {string[]} [requires] Prerequisite node ids (any rank >= 1)
 * @property {SkillNodeEffect[]} effects
 */

export const MAX_PLAYER_LEVEL = 30;

/** @type {SkillNodeDef[]} */
export const SKILL_NODES = [
    // ── Marksmanship ──────────────────────────────────────────────────────
    {
        id: 'sharp_shots',
        name: 'Sharp Shots',
        description: '+2 base damage per rank',
        branch: 'marksmanship',
        tier: 1,
        column: 1,
        maxRank: 3,
        effects: [{ stat: 'damage', perRank: 2 }],
    },
    {
        id: 'keen_eye',
        name: 'Keen Eye',
        description: '+3% crit chance per rank',
        branch: 'marksmanship',
        tier: 1,
        column: 2,
        maxRank: 3,
        effects: [{ stat: 'critChance', perRank: 3 }],
    },
    {
        id: 'steady_aim',
        name: 'Steady Aim',
        description: '+40 attack range per rank',
        branch: 'marksmanship',
        tier: 2,
        column: 1,
        maxRank: 2,
        requires: ['sharp_shots'],
        effects: [{ stat: 'attackRange', perRank: 40 }],
    },
    {
        id: 'quick_draw',
        name: 'Quick Draw',
        description: '-6% attack cooldown per rank',
        branch: 'marksmanship',
        tier: 2,
        column: 2,
        maxRank: 2,
        requires: ['keen_eye'],
        effects: [{ stat: 'attackSpeed', perRank: 6 }],
    },
    {
        id: 'multishot',
        name: 'Multishot',
        description: '+1 projectile per rank',
        branch: 'marksmanship',
        tier: 3,
        column: 1,
        maxRank: 2,
        requires: ['steady_aim'],
        effects: [{ stat: 'projectiles', perRank: 1 }],
    },
    {
        id: 'piercing_shots',
        name: 'Piercing Shots',
        description: 'Arrows pierce +1 enemy per rank',
        branch: 'marksmanship',
        tier: 3,
        column: 2,
        maxRank: 3,
        requires: ['quick_draw'],
        effects: [{ stat: 'pierceCount', perRank: 1 }],
    },
    {
        id: 'lethal_blows',
        name: 'Lethal Blows',
        description: '+12% crit damage per rank',
        branch: 'marksmanship',
        tier: 4,
        column: 1,
        maxRank: 2,
        requires: ['multishot', 'piercing_shots'],
        effects: [{ stat: 'critDamage', perRank: 12 }],
    },
    {
        id: 'vitality',
        name: 'Vitality',
        description: '+25 max HP per rank',
        branch: 'marksmanship',
        tier: 1,
        column: 0,
        maxRank: 3,
        effects: [{ stat: 'health', perRank: 25 }],
    },

    // ── Chain ─────────────────────────────────────────────────────────────
    {
        id: 'chain_strike',
        name: 'Chain Strike',
        description: 'Unlock chain lightning on arrows (+1 bounce per rank)',
        branch: 'chain',
        tier: 1,
        column: 1,
        maxRank: 3,
        effects: [
            { stat: 'chainEnabled', perRank: 1, setOnFirstRank: true },
            { stat: 'chainCount', perRank: 1 },
        ],
    },
    {
        id: 'chain_range',
        name: 'Long Arc',
        description: '+60 chain range per rank',
        branch: 'chain',
        tier: 2,
        column: 1,
        maxRank: 2,
        requires: ['chain_strike'],
        effects: [{ stat: 'chainRange', perRank: 60 }],
    },
    {
        id: 'chain_power',
        name: 'Chain Power',
        description: '+0.15 chain damage multiplier per rank',
        branch: 'chain',
        tier: 2,
        column: 2,
        maxRank: 2,
        requires: ['chain_strike'],
        effects: [{ stat: 'chainDamage', perRank: 0.15 }],
    },
    {
        id: 'ricochet',
        name: 'Ricochet',
        description: '+1 extra chain bounce (one-time at rank 1)',
        branch: 'chain',
        tier: 3,
        column: 1,
        maxRank: 1,
        requires: ['chain_range', 'chain_power'],
        effects: [{ stat: 'chainCount', perRank: 2 }],
    },

    // ── Elemental ─────────────────────────────────────────────────────────
    {
        id: 'kindling',
        name: 'Kindling',
        description: 'Basic attacks can apply burn (rank 2: stronger burn)',
        branch: 'elemental',
        tier: 1,
        column: 1,
        maxRank: 2,
        effects: [{ stat: 'basicBurnChance', perRank: 50 }],
    },
    {
        id: 'toxin',
        name: 'Toxin',
        description: 'Basic attacks can apply poison',
        branch: 'elemental',
        tier: 1,
        column: 2,
        maxRank: 2,
        requires: ['kindling'],
        effects: [{ stat: 'basicPoisonChance', perRank: 40 }],
    },
    {
        id: 'permafrost',
        name: 'Permafrost',
        description: 'Basic attacks can apply slow/freeze',
        branch: 'elemental',
        tier: 2,
        column: 1,
        maxRank: 2,
        requires: ['toxin'],
        effects: [{ stat: 'basicFreezeChance', perRank: 35 }],
    },
    {
        id: 'empower_mastery',
        name: 'Empower Mastery',
        description: '+2s Empower duration per rank',
        branch: 'elemental',
        tier: 2,
        column: 2,
        maxRank: 2,
        requires: ['kindling'],
        effects: [{ ability: 'ability3', field: 'buffDuration', perRank: 2 }],
    },
    {
        id: 'inferno_touch',
        name: 'Inferno Touch',
        description: 'Burn deals +2 damage per tick per rank',
        branch: 'elemental',
        tier: 3,
        column: 1,
        maxRank: 2,
        requires: ['permafrost'],
        effects: [{ stat: 'burnTickDamage', perRank: 2 }],
    },

    // ── Abilities ─────────────────────────────────────────────────────────
    {
        id: 'unlock_barrage',
        name: 'Arrow Barrage',
        description: 'Unlock ability: Arrow Barrage (key 1)',
        branch: 'abilities',
        tier: 1,
        column: 0,
        maxRank: 1,
        effects: [{ unlock: 'ability1' }],
    },
    {
        id: 'barrage_mastery',
        name: 'Barrage Mastery',
        description: '+2 arrows and +10% damage per rank',
        branch: 'abilities',
        tier: 2,
        column: 0,
        maxRank: 3,
        requires: ['unlock_barrage'],
        effects: [
            { ability: 'ability1', field: 'arrowCount', perRank: 2 },
            { ability: 'ability1', field: 'damageMultiplier', perRank: 0.1 },
        ],
    },
    {
        id: 'unlock_rapid',
        name: 'Rapid Fire',
        description: 'Unlock ability: Rapid Fire (key 2)',
        branch: 'abilities',
        tier: 1,
        column: 1,
        maxRank: 1,
        requires: ['unlock_barrage'],
        effects: [{ unlock: 'ability2' }],
    },
    {
        id: 'rapid_mastery',
        name: 'Rapid Mastery',
        description: '+2 shots and -0.02s delay per rank',
        branch: 'abilities',
        tier: 2,
        column: 1,
        maxRank: 3,
        requires: ['unlock_rapid'],
        effects: [
            { ability: 'ability2', field: 'arrowCount', perRank: 2 },
            { ability: 'ability2', field: 'fireDelay', perRank: -0.02 },
        ],
    },
    {
        id: 'unlock_empower',
        name: 'Empower',
        description: 'Unlock ability: Empower (key 3)',
        branch: 'abilities',
        tier: 1,
        column: 2,
        maxRank: 1,
        requires: ['unlock_barrage'],
        effects: [{ unlock: 'ability3' }],
    },
    {
        id: 'unlock_frost',
        name: 'Frost Arrow',
        description: 'Unlock ability: Frost Arrow (key 4)',
        branch: 'abilities',
        tier: 2,
        column: 2,
        maxRank: 1,
        requires: ['unlock_empower'],
        effects: [{ unlock: 'ability4' }],
    },
    {
        id: 'frost_mastery',
        name: 'Frost Mastery',
        description: '+40 explosion radius and +0.5s freeze per rank',
        branch: 'abilities',
        tier: 3,
        column: 2,
        maxRank: 2,
        requires: ['unlock_frost'],
        effects: [
            { ability: 'ability4', field: 'explosionRadius', perRank: 40 },
            { ability: 'ability4', field: 'freezeDuration', perRank: 0.5 },
        ],
    },
    {
        id: 'unlock_venom',
        name: 'Venom Nova',
        description: 'Unlock ability: Venom Nova (key 5)',
        branch: 'abilities',
        tier: 3,
        column: 0,
        maxRank: 1,
        requires: ['barrage_mastery', 'toxin'],
        effects: [{ unlock: 'ability5' }],
    },
    {
        id: 'venom_mastery',
        name: 'Venom Mastery',
        description: '+25 radius and +1 poison damage per rank',
        branch: 'abilities',
        tier: 4,
        column: 0,
        maxRank: 2,
        requires: ['unlock_venom'],
        effects: [
            { ability: 'ability5', field: 'explosionRadius', perRank: 25 },
            { ability: 'ability5', field: 'poisonDamage', perRank: 1 },
        ],
    },
    {
        id: 'unlock_spin',
        name: 'Spinshot',
        description: 'Unlock ability: Spinshot (key 6) — 360° arrow spin for 2s',
        branch: 'abilities',
        tier: 3,
        column: 1,
        maxRank: 1,
        requires: ['rapid_mastery', 'chain_strike'],
        effects: [{ unlock: 'ability6' }],
    },
    {
        id: 'spin_mastery',
        name: 'Spin Mastery',
        description: '+0.4s duration, +1 arrow per wave, +10% damage, faster fire per rank',
        branch: 'abilities',
        tier: 4,
        column: 1,
        maxRank: 3,
        requires: ['unlock_spin'],
        effects: [
            { ability: 'ability6', field: 'spinDuration', perRank: 0.4 },
            { ability: 'ability6', field: 'arrowsPerWave', perRank: 1 },
            { ability: 'ability6', field: 'damageMultiplier', perRank: 0.1 },
            { ability: 'ability6', field: 'fireInterval', perRank: -0.008 },
        ],
    },
];

const nodeById = new Map(SKILL_NODES.map((n) => [n.id, n]));

/** @param {string} id */
export function getSkillNode(id) {
    return nodeById.get(id) ?? null;
}

export const SKILL_BRANCHES = [
    { id: 'marksmanship', label: 'Marksmanship', color: '#ff8844' },
    { id: 'chain', label: 'Chain', color: '#88ccff' },
    { id: 'elemental', label: 'Elemental', color: '#44ff88' },
    { id: 'abilities', label: 'Abilities', color: '#b674ff' },
];
