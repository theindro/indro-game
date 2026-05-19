import {
    getQuestDefinition,
    getUnlockedQuests,
    QuestType,
    questMatchesItem,
} from './questDefinitions.js';

/**
 * @param {import('../../stores/gameStore.js').useGameStore.getState} get
 * @returns {{ progress: Record<string, number>, completed: string[], recentComplete: object|null }}
 */
export function getQuestState(get) {
    const q = get().quests;
    return {
        progress: q?.progress ?? {},
        completed: q?.completed ?? [],
        recentComplete: q?.recentComplete ?? null,
    };
}

/**
 * @param {object} quests
 * @param {import('./questDefinitions.js').QuestDefinition} def
 */
function getProgress(quests, def) {
    return quests.progress[def.id] ?? 0;
}

/**
 * @param {Function} get
 * @param {Function} set
 * @param {string} questId
 */
function completeQuest(get, set, questId) {
    const def = getQuestDefinition(questId);
    if (!def) return;

    const { addGold, addXP } = get();
    if (def.rewards.gold) addGold(def.rewards.gold);
    if (def.rewards.xp) addXP(def.rewards.xp);

    set((state) => {
        const completed = state.quests.completed.includes(questId)
            ? state.quests.completed
            : [...state.quests.completed, questId];

        const { [questId]: _removed, ...restProgress } = state.quests.progress;

        return {
            quests: {
                ...state.quests,
                progress: restProgress,
                completed,
                recentComplete: {
                    id: questId,
                    title: def.title,
                    gold: def.rewards.gold ?? 0,
                    xp: def.rewards.xp ?? 0,
                    at: Date.now(),
                },
            },
        };
    });
}

/**
 * @param {Function} get
 * @param {Function} set
 * @param {string} questId
 * @param {number} nextValue
 */
function setQuestProgress(get, set, questId, nextValue) {
    const def = getQuestDefinition(questId);
    if (!def) return;

    if (nextValue >= def.target) {
        completeQuest(get, set, questId);
        return;
    }

    set((state) => ({
        quests: {
            ...state.quests,
            progress: {
                ...state.quests.progress,
                [questId]: nextValue,
            },
        },
    }));
}

/**
 * @param {Function} get
 * @param {Function} set
 * @param {import('./questDefinitions.js').QuestDefinition} def
 * @param {number} delta
 */
function bumpQuest(get, set, def, delta) {
    const { completed, progress } = getQuestState(get);
    if (completed.includes(def.id)) return;

    const unlocked = getUnlockedQuests(completed).some((q) => q.id === def.id);
    if (!unlocked) return;

    const current = progress[def.id] ?? 0;
    setQuestProgress(get, set, def.id, current + delta);
}

/**
 * @param {Function} get
 * @param {Function} set
 * @param {number} [amount=1]
 */
export function onQuestMobKilled(get, set, amount = 1) {
    const { completed } = getQuestState(get);
    const unlocked = getUnlockedQuests(completed);

    for (const def of unlocked) {
        if (def.type !== QuestType.KILL) continue;
        bumpQuest(get, set, def, amount);
    }
}

/**
 * @param {Function} get
 * @param {Function} set
 * @param {string} itemId
 * @param {number} [quantity=1]
 */
export function onQuestItemCollected(get, set, itemId, quantity = 1) {
    const { completed } = getQuestState(get);
    const unlocked = getUnlockedQuests(completed);

    for (const def of unlocked) {
        if (def.type !== QuestType.COLLECT) continue;
        if (!questMatchesItem(def, itemId)) continue;
        bumpQuest(get, set, def, quantity);
    }
}

/**
 * @param {Function} get
 * @param {Function} set
 * @param {string} itemId
 * @param {number} [quantity=1]
 */
export function onQuestItemCrafted(get, set, itemId, quantity = 1) {
    const { completed } = getQuestState(get);
    const unlocked = getUnlockedQuests(completed);

    for (const def of unlocked) {
        if (def.type !== QuestType.CRAFT) continue;
        if (!questMatchesItem(def, itemId)) continue;
        bumpQuest(get, set, def, quantity);
    }
}

/** @param {Function} set */
export function clearQuestToast(set) {
    set((state) => ({
        quests: {
            ...state.quests,
            recentComplete: null,
        },
    }));
}
