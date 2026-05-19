import React from 'react';
import { Progress, Typography } from 'antd';
import { useGameStore } from '../../../stores/gameStore.js';
import { getActiveMainQuests } from '../../../game/quests/questDefinitions.js';
import {
    getQuestLabel,
    getQuestProgressPercent,
    getQuestTypeIcon,
} from './questUtils.js';

const { Text } = Typography;

function QuestRow({ quest, progressMap, onOpenQuests }) {
    const pct = getQuestProgressPercent(quest, progressMap);

    return (
        <button
            type="button"
            onClick={onOpenQuests}
            style={{
                display: 'block',
                width: '100%',
                margin: 0,
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.35)',
                cursor: 'pointer',
                textAlign: 'left',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{getQuestTypeIcon(quest)}</span>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 700 }} ellipsis>
                    {quest.title}
                </Text>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                {getQuestLabel(quest, progressMap)}
            </Text>
            <Progress
                percent={pct}
                size="small"
                showInfo={false}
                strokeColor={{ from: '#7b2ff7', to: '#b674ff' }}
                trailColor="rgba(255,255,255,0.1)"
            />
        </button>
    );
}

export default function QuestTracker({ onOpenQuests }) {
    const completed = useGameStore((s) => s.quests?.completed ?? []);
    const progressMap = useGameStore((s) => s.quests?.progress ?? {});

    const mainQuests = getActiveMainQuests(completed).slice(0, 4);

    if (mainQuests.length === 0) {
        return (
            <div className="quest-tracker-panel">
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                    Main quests complete
                </Text>
            </div>
        );
    }

    return (
        <div className="quest-tracker-panel">
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
                    QUESTS
                </Text>
                <button
                    type="button"
                    onClick={onOpenQuests}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 10,
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    View all (P)
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mainQuests.map((quest) => (
                    <QuestRow
                        key={quest.id}
                        quest={quest}
                        progressMap={progressMap}
                        onOpenQuests={onOpenQuests}
                    />
                ))}
            </div>
        </div>
    );
}
