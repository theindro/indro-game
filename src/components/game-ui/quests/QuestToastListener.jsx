import { useEffect } from 'react';
import { message } from 'antd';
import { useGameStore } from '../../../stores/gameStore.js';

/** Shows a toast when a quest completes and rewards are granted. */
export default function QuestToastListener() {
    const recentComplete = useGameStore((s) => s.quests?.recentComplete);
    const clearQuestToast = useGameStore((s) => s.clearQuestToast);

    useEffect(() => {
        if (!recentComplete) return;

        const parts = [];
        if (recentComplete.gold) parts.push(`${recentComplete.gold} gold`);
        if (recentComplete.xp) parts.push(`${recentComplete.xp} XP`);

        message.success({
            content: `Quest complete: ${recentComplete.title}${parts.length ? ` (+${parts.join(', ')})` : ''}`,
            duration: 4,
        });

        const t = setTimeout(() => clearQuestToast(), 100);
        return () => clearTimeout(t);
    }, [recentComplete, clearQuestToast]);

    return null;
}
