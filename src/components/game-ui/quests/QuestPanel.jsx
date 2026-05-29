import React, { useMemo } from 'react';
import { Card, Progress, Tag, Typography } from 'antd';
import { CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useGameStore } from '../../../stores/gameStore.js';
import {
    QUEST_DEFINITIONS,
    getQuestDefinition,
    getUnlockedQuests,
} from '../../../game/quests/questDefinitions.js';
import {
    getQuestItemName,
    getQuestLabel,
    getQuestProgressPercent,
    getQuestProgressValue,
    getQuestRewardsText,
    getQuestTypeIcon,
} from './questUtils.js';

const { Text, Title } = Typography;

function QuestCard({ quest, progressMap, completed, locked }) {
    const current = getQuestProgressValue(quest, progressMap);
    const pct = getQuestProgressPercent(quest, progressMap);
    const itemHint = getQuestItemName(quest);
    const prereqLabel = (quest.prerequisites ?? [])
        .map((id) => getQuestDefinition(id)?.title ?? id)
        .join(', ');

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span>{getQuestTypeIcon(quest)}</span>
                    <Text strong>
                        {quest.title}
                    </Text>
                    {quest.category === 'main' && (
                        <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>
                            Main
                        </Tag>
                    )}
                </div>
                {completed && <CheckCircleOutlined style={{ color: '#44ff88', fontSize: 16 }} />}
                {locked && <LockOutlined style={{ color: 'rgba(0,0,0,0.35)' }} />}
            </div>

            <Text style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12, display: 'block', marginBottom: 4 }}>
                {locked
                    ? `Requires: ${prereqLabel}`
                    : getQuestLabel(quest, progressMap)}
            </Text>

            {itemHint && !locked && !completed && (
                <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                    Target: {itemHint}
                </Text>
            )}

            {!locked && !completed && (
                <Progress
                    percent={pct}
                    size="small"
                    format={() => `${Math.min(current, quest.target)} / ${quest.target}`}
                    strokeColor={{ from: '#f7892f', to: '#ffa974' }}
                    strokeWidth={8}
                    trailColor="rgba(0,0,0,0.1)"
                />
            )}

            <Text style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                Reward: {getQuestRewardsText(quest)}
            </Text>
        </Card>
    );
}

export default function QuestPanel({ isOpen }) {
    const completed = useGameStore((s) => s.quests?.completed ?? []);
    const progressMap = useGameStore((s) => s.quests?.progress ?? {});

    const unlocked = useMemo(() => getUnlockedQuests(completed), [completed]);

    const locked = useMemo(
        () =>
            QUEST_DEFINITIONS.filter((q) => {
                if (completed.includes(q.id)) return false;
                return !unlocked.some((u) => u.id === q.id);
            }),
        [completed, unlocked]
    );

    if (!isOpen) return null;

    return (
        <Card
            style={{ width: 420, maxHeight: '70vh' }}
            className="bottom-right-float-card quest-panel-card"
            styles={{ body: { padding: 0 }, header: { display: 'none' } }}
        >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <Title level={5} style={{ margin: 0 }}>
                    Quest Log
                </Title>
                <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                    Complete objectives for gold and experience
                </Text>
            </div>

            <div style={{ padding: 14, maxHeight: 'calc(70vh - 160px)', overflowY: 'auto' }}>
                {unlocked.length > 0 && (
                    <>
                        <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 700 }}>
                            ACTIVE
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginBottom: 16 }}>
                            {unlocked.map((quest) => (
                                <QuestCard
                                    key={quest.id}
                                    quest={quest}
                                    progressMap={progressMap}
                                    completed={false}
                                    locked={false}
                                />
                            ))}
                        </div>
                    </>
                )}

                {locked.length > 0 && (
                    <>
                        <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 700 }}>
                            LOCKED
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginBottom: 16 }}>
                            {locked.map((quest) => (
                                <QuestCard
                                    key={quest.id}
                                    quest={quest}
                                    progressMap={progressMap}
                                    completed={false}
                                    locked
                                />
                            ))}
                        </div>
                    </>
                )}

                {completed.length > 0 && (
                    <>
                        <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 700 }}>
                            COMPLETED
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            {completed.map((id) => {
                                const quest = QUEST_DEFINITIONS.find((q) => q.id === id);
                                if (!quest) return null;
                                return (
                                    <QuestCard
                                        key={quest.id}
                                        quest={quest}
                                        progressMap={progressMap}
                                        completed
                                        locked={false}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}
