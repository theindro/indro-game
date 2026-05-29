import React from 'react';
import {Button, Card, Progress, Tag, Typography} from 'antd';
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
        <Card>
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
        </Card>
    );
}

function QuestRow({ quest, progressMap, onOpenQuests }) {
    const pct = getQuestProgressPercent(quest, progressMap);

    return (
        <Card bodyStyle={{padding: 12}} style={{borderRadius: 12, border: 'solid 2px #b09384'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: 700 }} ellipsis>
                    {quest.title}
                </Text>
            </div>
            <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                {getQuestLabel(quest, progressMap)}
            </Text>
            <Progress
                percent={pct}
                size="small"
                showInfo={false}
                strokeColor={{ from: '#f7892f', to: '#ffa974' }}
                trailColor="rgba(255,255,255,0.1)"
            />
        </Card>
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
                <Button
                    type="text"
                    size="small"
                    onClick={onOpenQuests}
                    style={{color: "#fff"}}
                >
                    View all (P)
                </Button>
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
