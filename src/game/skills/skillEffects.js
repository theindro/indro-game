import { INITIAL_ABILITIES } from '../abilities/initialAbilities.js';
import { getSkillNode, SKILL_NODES } from './skillTreeDefinitions.js';

function cloneAbilities(source) {
    return JSON.parse(JSON.stringify(source));
}

/** Map retired skill node ids from older saves. */
export function migrateSkillRanks(ranks = {}) {
    const r = { ...ranks };
    if (r.unlock_arc && !r.unlock_spin) {
        r.unlock_spin = r.unlock_arc;
        delete r.unlock_arc;
    }
    if (r.arc_mastery && !r.spin_mastery) {
        r.spin_mastery = r.arc_mastery;
        delete r.arc_mastery;
    }
    return r;
}

/**
 * @param {Record<string, number>} ranks
 */
export function createEmptySkillModifiers() {
    return {
        damage: 0,
        health: 0,
        attackSpeed: 0,
        attackRange: 0,
        projectileSpeed: 0,
        projectiles: 0,
        critChance: 0,
        critDamage: 0,
        pierceCount: 0,
        chainCount: 0,
        chainRange: 0,
        chainDamage: 0,
        chainEnabled: false,
        basicBurnChance: 0,
        basicPoisonChance: 0,
        basicFreezeChance: 0,
        burnTickDamage: 0,
        moveSpeedPct: 0,
        dashCooldownPct: 0,
        dashMaxCharges: 0,
        gatherSpeedPct: 0,
        gatherYieldPct: 0,
        unlockedAbilities: {
            ability1: false,
            ability2: false,
            ability3: false,
            ability4: false,
            ability5: false,
            ability6: false,
            ability7: false,
        },
        abilityDeltas: {
            ability1: {},
            ability2: {},
            ability3: {},
            ability4: {},
            ability5: {},
            ability6: {},
            ability7: {},
        },
    };
}

/**
 * @param {Record<string, number>} ranks
 */
export function computeSkillModifiers(ranks = {}) {
    const mods = createEmptySkillModifiers();
    const migrated = migrateSkillRanks(ranks);

    for (const node of SKILL_NODES) {
        const rank = migrated[node.id] ?? 0;
        if (rank <= 0) continue;

        for (const effect of node.effects) {
            if (effect.unlock) {
                const key = effect.unlock;
                if (key.startsWith('ability')) {
                    mods.unlockedAbilities[key] = true;
                }
                continue;
            }

            if (effect.ability && effect.field) {
                const bucket = mods.abilityDeltas[effect.ability] ?? {};
                bucket[effect.field] = (bucket[effect.field] ?? 0) + effect.perRank * rank;
                mods.abilityDeltas[effect.ability] = bucket;
                continue;
            }

            if (effect.stat) {
                if (effect.stat === 'chainEnabled' && effect.setOnFirstRank) {
                    mods.chainEnabled = true;
                }
                mods[effect.stat] = (mods[effect.stat] ?? 0) + effect.perRank * rank;
            }
        }
    }

    return mods;
}

/**
 * Gathering bonuses applied to interactable harvest time and loot amounts.
 * @param {Record<string, number>} [ranks]
 */
export function getGatheringModifiers(ranks = {}) {
    const mods = computeSkillModifiers(ranks);
    return {
        speedMul: 1 + (mods.gatherSpeedPct ?? 0) / 100,
        yieldMul: 1 + (mods.gatherYieldPct ?? 0) / 100,
    };
}

/**
 * @param {typeof import('../abilities/initialAbilities.js').INITIAL_ABILITIES} baseAbilities
 * @param {ReturnType<typeof computeSkillModifiers>} mods
 */
export function applyAbilitySkillDeltas(currentAbilities, mods) {
    const out = cloneAbilities(currentAbilities ?? INITIAL_ABILITIES);

    for (const key of ['ability5', 'ability6', 'ability7']) {
        if (!out[key] && mods.unlockedAbilities[key]) {
            out[key] = cloneAbilities({ [key]: INITIAL_ABILITIES[key] })[key];
        }
    }

    for (const key of Object.keys(INITIAL_ABILITIES)) {
        if (!out[key]) {
            out[key] = cloneAbilities({ [key]: INITIAL_ABILITIES[key] })[key];
        }
    }

    for (const [abilityKey, deltas] of Object.entries(mods.abilityDeltas)) {
        if (!out[abilityKey]) continue;
        const base = INITIAL_ABILITIES[abilityKey] ?? {};
        for (const [field, delta] of Object.entries(deltas)) {
            const baseVal = base[field];
            if (typeof baseVal === 'number' && typeof delta === 'number') {
                let next = baseVal + delta;
                if (field === 'maxCooldown') {
                    next = Math.max(4, next);
                }
                out[abilityKey][field] = next;
            }
        }
    }

    return out;
}

/**
 * @param {Record<string, number>} ranks
 * @param {number} level
 */
export function getTotalSkillPointsSpent(ranks = {}) {
    return Object.values(ranks).reduce((s, r) => s + (r ?? 0), 0);
}

/**
 * Skill points earned = player level (capped at 30).
 * @param {number} level
 */
export function getSkillPointsEarned(level) {
    return Math.min(level, 30);
}

/**
 * @param {Record<string, number>} ranks
 * @param {string} nodeId
 */
export function canAllocateSkill(ranks, nodeId, level) {
    const node = getSkillNode(nodeId);
    if (!node) return { ok: false, reason: 'Unknown skill' };

    const current = ranks[nodeId] ?? 0;
    if (current >= node.maxRank) return { ok: false, reason: 'Max rank' };

    const earned = getSkillPointsEarned(level);
    const spent = getTotalSkillPointsSpent(ranks);
    if (spent >= earned) return { ok: false, reason: 'No skill points' };

    for (const req of node.requires ?? []) {
        if ((ranks[req] ?? 0) < 1) {
            const reqNode = getSkillNode(req);
            return { ok: false, reason: `Requires ${reqNode?.name ?? req}` };
        }
    }

    return { ok: true };
}

/** Nodes that list `nodeId` in `requires`. */
export function getDependentSkillNodes(nodeId) {
    return SKILL_NODES.filter((n) => (n.requires ?? []).includes(nodeId));
}

/**
 * @param {Record<string, number>} ranks
 * @param {string} nodeId
 */
export function canDeallocateSkill(ranks, nodeId) {
    const node = getSkillNode(nodeId);
    if (!node) return { ok: false, reason: 'Unknown skill' };

    const current = ranks[nodeId] ?? 0;
    if (current <= 0) return { ok: false, reason: 'No ranks allocated' };

    for (const dep of getDependentSkillNodes(nodeId)) {
        if ((ranks[dep.id] ?? 0) > 0) {
            return { ok: false, reason: `Remove points from ${dep.name} first` };
        }
    }

    return { ok: true };
}
