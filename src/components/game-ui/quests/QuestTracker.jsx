import React from 'react';
import { Progress, Tag, Typography } from 'antd';
import { useGameStore } from '../../../stores/gameStore.js';
import { getActiveMainQuests } from '../../../game/quests/questDefinitions.js';
import {
    getQuestLabel,
    getQuestProgressPercent,
} from './questUtils.js';

const { Text } = Typography;

const TEMP_EVENT_STROKE = { from: '#ff7700', to: '#ffbb44' };

function TemporaryEventRow({ event, onOpenQuests }) {
    return (
        <button
            type="button"
            onClick={onOpenQuests}
            style={{
                display: 'block',
                width: '100%',
                margin: 0,
                marginBottom: 8,
                padding: '8px 10px',
                border: '1px solid rgba(255, 140, 0, 0.45)',
                borderRadius: 8,
                background: 'rgba(255, 100, 0, 0.12)',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 0 12px rgba(255, 120, 0, 0.15)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 700 }} ellipsis>
                    {event.title}
                </Text>
                <Tag
                    color="orange"
                    style={{ margin: 0, fontSize: 9, lineHeight: '16px', padding: '0 5px' }}
                >
                    {event.tag}
                </Tag>
            </div>
            <Text style={{ color: 'rgba(255, 200, 120, 0.9)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                {event.label}
            </Text>
            <Progress
                percent={event.percent}
                size="small"
                showInfo={false}
                strokeColor={TEMP_EVENT_STROKE}
                trailColor="rgba(255, 255, 255, 0.12)"
            />
        </button>
    );
}

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
    const temporaryEvent = useGameStore((s) => s.quests?.temporaryEvent);

    const mainQuests = getActiveMainQuests(completed).slice(0, 4);
    const hasMain = mainQuests.length > 0;
    const hasTemp = temporaryEvent != null;

    if (!hasTemp && !hasMain) {
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
                {hasTemp && (
                    <TemporaryEventRow event={temporaryEvent} onOpenQuests={onOpenQuests} />
                )}
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
