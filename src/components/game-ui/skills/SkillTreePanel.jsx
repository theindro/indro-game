import React, { useMemo } from 'react';
import { Card, Typography, Tag, Button, Tabs, message } from 'antd';
import { LockOutlined, PlusOutlined } from '@ant-design/icons';
import { useGameStore } from '../../../stores/gameStore.js';
import {
    SKILL_BRANCHES,
    SKILL_NODES,
    MAX_PLAYER_LEVEL,
} from '../../../game/skills/skillTreeDefinitions.js';
import { canAllocateSkill, getSkillPointsEarned, getTotalSkillPointsSpent } from '../../../game/skills/skillEffects.js';

const { Text, Title } = Typography;

function SkillNodeCard({ node, rank, ranks, level, pointsAvailable, onAllocate }) {
    const maxed = rank >= node.maxRank;
    const check = canAllocateSkill(ranks, node.id, level);
    const canBuy = check.ok && !maxed;

    let border = 'rgba(255,255,255,0.12)';
    if (maxed) border = 'rgba(68,255,136,0.5)';
    else if (canBuy) border = 'rgba(180,100,255,0.55)';

    return (
        <div
            style={{
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: maxed ? 'rgba(68,255,136,0.08)' : 'rgba(0,0,0,0.35)',
                minHeight: 88,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <Text strong style={{ color: '#fff', fontSize: 12 }}>
                    {node.name}
                </Text>
                <Tag style={{ margin: 0 }}>{rank}/{node.maxRank}</Tag>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, display: 'block', marginBottom: 8 }}>
                {node.description}
            </Text>
            {!maxed && !canBuy && check.reason && (
                <Text style={{ color: 'rgba(255,180,100,0.85)', fontSize: 10, display: 'block', marginBottom: 6 }}>
                    <LockOutlined /> {check.reason}
                </Text>
            )}
            <Button
                type={canBuy ? 'primary' : 'default'}
                size="small"
                disabled={!canBuy}
                icon={<PlusOutlined />}
                onClick={() => onAllocate(node.id)}
                block
            >
                {maxed ? 'Maxed' : 'Spend point'}
            </Button>
        </div>
    );
}

function BranchGrid({ branchId, ranks, level, pointsAvailable, onAllocate }) {
    const nodes = SKILL_NODES.filter((n) => n.branch === branchId).sort(
        (a, b) => a.tier - b.tier || a.column - b.column
    );
    const maxTier = Math.max(...nodes.map((n) => n.tier), 1);

    const rows = [];
    for (let t = 1; t <= maxTier; t++) {
        rows.push(nodes.filter((n) => n.tier === t));
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((row, ri) => (
                <div
                    key={ri}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                        gap: 8,
                    }}
                >
                    {row.map((node) => (
                        <SkillNodeCard
                            key={node.id}
                            node={node}
                            rank={ranks[node.id] ?? 0}
                            ranks={ranks}
                            level={level}
                            pointsAvailable={pointsAvailable}
                            onAllocate={onAllocate}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default function SkillTreePanel({ isOpen }) {
    const [messageApi, contextHolder] = message.useMessage();
    const level = useGameStore((s) => s.player.pLevel);
    const ranks = useGameStore((s) => s.skills?.ranks ?? {});
    const allocateSkillPoint = useGameStore((s) => s.allocateSkillPoint);

    const earned = getSkillPointsEarned(level);
    const spent = getTotalSkillPointsSpent(ranks);
    const available = earned - spent;

    const tabItems = useMemo(
        () =>
            SKILL_BRANCHES.map((b) => ({
                key: b.id,
                label: (
                    <span style={{ color: b.color }}>{b.label}</span>
                ),
                children: (
                    <BranchGrid
                        branchId={b.id}
                        ranks={ranks}
                        level={level}
                        pointsAvailable={available}
                        onAllocate={(nodeId) => {
                            const res = allocateSkillPoint(nodeId);
                            if (res?.ok) messageApi.success('Skill upgraded');
                            else messageApi.warning(res?.reason ?? 'Cannot allocate');
                        }}
                    />
                ),
            })),
        [ranks, level, available, allocateSkillPoint, messageApi]
    );

    if (!isOpen) return null;

    return (
        <>
            {contextHolder}
            <Card
                className="bottom-right-float-card quest-panel-card"
                style={{ width: 720, maxHeight: '72vh', overflow: 'hidden' }}
                styles={{ body: { padding: 16, overflow: 'auto', maxHeight: 'calc(72vh - 56px)' } }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0, color: '#fff' }}>
                            Skill Tree
                        </Title>
                        <Tag color="purple">
                            {available} / {earned} points · Lv {level}/{MAX_PLAYER_LEVEL}
                        </Tag>
                    </div>
                }
            >
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'block', marginBottom: 12 }}>
                    Earn 1 skill point per level (max {MAX_PLAYER_LEVEL}). Arrow Barrage starts unlocked — spend points to
                    unlock abilities and passives (pierce, chain, elements).
                </Text>
                <Tabs items={tabItems} size="small" />
            </Card>
        </>
    );
}
