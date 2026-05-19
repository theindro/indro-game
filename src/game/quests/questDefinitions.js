/**
 * Quest catalog — add entries here to extend the game.
 *
 * @typedef {'kill'|'craft'|'collect'} QuestTypeId
 *
 * @typedef {object} QuestRewards
 * @property {number} [gold]
 * @property {number} [xp]
 *
 * @typedef {object} QuestDefinition
 * @property {string} id
 * @property {'main'|'side'} [category]
 * @property {QuestTypeId} type
 * @property {string} title
 * @property {string} description Template with {{current}} and {{target}}
 * @property {number} target
 * @property {string} [itemId] Required for craft / collect
 * @property {QuestRewards} rewards
 * @property {string[]} [prerequisites] Quest ids that must be completed first
 */

export const QuestType = {
    KILL: 'kill',
    CRAFT: 'craft',
    COLLECT: 'collect',
};

/** @type {QuestDefinition[]} */
export const MAIN_QUESTS = [
    {
        id: 'main_gather_herbs',
        category: 'main',
        type: QuestType.COLLECT,
        title: 'Herbalist',
        description: 'Collect {{current}}/{{target}} herbs',
        target: 6,
        itemId: 'herb',
        rewards: { gold: 30, xp: 60 },
        prerequisites: [],
    },
    {
        id: 'main_gather_wood',
        category: 'main',
        type: QuestType.COLLECT,
        title: 'Lumber Run',
        description: 'Collect {{current}}/{{target}} wood',
        target: 8,
        itemId: 'wood_plank',
        rewards: { gold: 35, xp: 70 },
        prerequisites: [],
    },
    {
        id: 'main_craft_bow',
        category: 'main',
        type: QuestType.CRAFT,
        title: 'Arms Maker',
        description: 'Craft a leather bow ({{current}}/{{target}})',
        target: 1,
        itemId: 'leather_bow',
        rewards: { gold: 60, xp: 120 },
        prerequisites: ['main_gather_wood'],
    },
    {
        id: 'main_iron_smith',
        category: 'main',
        type: QuestType.CRAFT,
        title: 'Iron Forged',
        description: 'Craft any iron gear piece ({{current}}/{{target}})',
        target: 1,
        itemId: 'iron_*',
        rewards: { gold: 150, xp: 250 },
        prerequisites: ['main_craft_bow', 'main_slayer'],
    },
];

/** @type {QuestDefinition[]} */
export const SLAYER_QUESTS = [
    {
        id: 'slayer_1',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer I',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 30,
        rewards: { gold: 100, xp: 150 },
        prerequisites: [],
    },
    {
        id: 'slayer_2',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer II',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 75,
        rewards: { gold: 180, xp: 250 },
        prerequisites: ['slayer_1'],
    },
    {
        id: 'slayer_3',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer III',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 150,
        rewards: { gold: 300, xp: 400 },
        prerequisites: ['slayer_2'],
    },
    {
        id: 'slayer_4',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer IV',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 300,
        rewards: { gold: 500, xp: 700 },
        prerequisites: ['slayer_3'],
    },
    {
        id: 'slayer_5',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer V',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 500,
        rewards: { gold: 800, xp: 1000 },
        prerequisites: ['slayer_4'],
    },
    {
        id: 'slayer_6',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer VI',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 750,
        rewards: { gold: 1200, xp: 1500 },
        prerequisites: ['slayer_5'],
    },
    {
        id: 'slayer_7',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer VII',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 1000,
        rewards: { gold: 1800, xp: 2200 },
        prerequisites: ['slayer_6'],
    },
    {
        id: 'slayer_8',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer VIII',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 1500,
        rewards: { gold: 2600, xp: 3200 },
        prerequisites: ['slayer_7'],
    },
    {
        id: 'slayer_9',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer IX',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 2500,
        rewards: { gold: 4000, xp: 5000 },
        prerequisites: ['slayer_8'],
    },
    {
        id: 'slayer_10',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Monster Slayer X',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 5000,
        rewards: { gold: 7000, xp: 8500 },
        prerequisites: ['slayer_9'],
    },
    {
        id: 'slayer_11',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Void Reaper',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 10000,
        rewards: { gold: 15000, xp: 18000 },
        prerequisites: ['slayer_10'],
    },
    {
        id: 'slayer_12',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'Apex Exterminator',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 25000,
        rewards: { gold: 40000, xp: 50000 },
        prerequisites: ['slayer_11'],
    },
    {
        id: 'slayer_13',
        category: 'slayer',
        type: QuestType.KILL,
        title: 'World Cleanser',
        description: 'Defeat {{current}}/{{target}} creatures',
        target: 50000,
        rewards: { gold: 100000, xp: 120000 },
        prerequisites: ['slayer_12'],
    },
];

export const QUEST_DEFINITIONS = [
    ...MAIN_QUESTS,
    ...SLAYER_QUESTS,
];

const questById = new Map(QUEST_DEFINITIONS.map((q) => [q.id, q]));

/** @param {string} id */
export function getQuestDefinition(id) {
    return questById.get(id) ?? null;
}

/** @param {string[]} completedIds */
export function getUnlockedQuests(completedIds) {
    const done = new Set(completedIds);
    return QUEST_DEFINITIONS.filter((q) => {
        if (done.has(q.id)) return false;
        return (q.prerequisites ?? []).every((p) => done.has(p));
    });
}

/** @param {string[]} completedIds */
export function getActiveMainQuests(completedIds) {
    return getUnlockedQuests(completedIds);
}

/**
 * @param {QuestDefinition} quest
 * @param {number} current
 */
export function formatQuestDescription(quest, current) {
    const target = quest.target;
    return quest.description
        .replace(/\{\{current\}\}/g, String(Math.min(current, target)))
        .replace(/\{\{target\}\}/g, String(target));
}

/**
 * @param {QuestDefinition} quest
 * @param {string} itemId
 */
export function questMatchesItem(quest, itemId) {
    if (!quest.itemId) return false;
    if (quest.itemId.endsWith('*')) {
        const prefix = quest.itemId.slice(0, -1);
        return itemId.startsWith(prefix);
    }
    return quest.itemId === itemId;
}
