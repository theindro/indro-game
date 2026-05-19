import { ItemDatabase } from '../../../game/items.js';
import {
    formatQuestDescription,
    getQuestDefinition,
} from '../../../game/quests/questDefinitions.js';

/** @param {import('../../../game/quests/questDefinitions.js').QuestDefinition} quest */
export function getQuestProgressValue(quest, progressMap) {
    return progressMap[quest.id] ?? 0;
}

/** @param {import('../../../game/quests/questDefinitions.js').QuestDefinition} quest */
export function isQuestReady(quest, progressMap) {
    return getQuestProgressValue(quest, progressMap) >= quest.target;
}

/** @param {import('../../../game/quests/questDefinitions.js').QuestDefinition} quest */
export function getQuestProgressPercent(quest, progressMap) {
    const current = getQuestProgressValue(quest, progressMap);
    return Math.min(100, Math.round((current / quest.target) * 100));
}

/** @param {import('../../../game/quests/questDefinitions.js').QuestDefinition} quest */
export function getQuestLabel(quest, progressMap) {
    return formatQuestDescription(quest, getQuestProgressValue(quest, progressMap));
}

/** @param {import('../../../game/quests/questDefinitions.js').QuestDefinition} quest */
export function getQuestItemName(quest) {
    if (!quest.itemId) return null;
    if (quest.itemId.endsWith('*')) {
        return quest.itemId.slice(0, -1).replace(/_$/, '') + ' gear';
    }
    return ItemDatabase[quest.itemId]?.name ?? quest.itemId;
}

/** @param {import('../../../game/quests/questDefinitions.js').QuestDefinition} quest */
export function getQuestTypeIcon(quest) {
    switch (quest.type) {
        case 'kill': return '⚔';
        case 'craft': return '⚒';
        case 'collect': return '📦';
        default: return '◆';
    }
}

export function getQuestRewardsText(quest) {
    const parts = [];
    if (quest.rewards.gold) parts.push(`${quest.rewards.gold} gold`);
    if (quest.rewards.xp) parts.push(`${quest.rewards.xp} XP`);
    return parts.join(' · ');
}

export { getQuestDefinition };
