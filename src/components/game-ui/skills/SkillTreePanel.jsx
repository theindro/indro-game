import React, { useCallback } from 'react';
import { Card, Typography, Tag, Tooltip, message } from 'antd';
import {
    LockOutlined,
    AimOutlined,
    EyeOutlined,
    ThunderboltOutlined,
    HeartOutlined,
    NodeIndexOutlined,
    FireOutlined,
    ExperimentOutlined,
    CloudOutlined,
    BugOutlined,
    RocketOutlined,
    SyncOutlined,
    KeyOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { useGameStore } from '../../../stores/gameStore.js';
import {
    SKILL_BRANCHES,
    SKILL_NODES,
    MAX_PLAYER_LEVEL,
} from '../../../game/skills/skillTreeDefinitions.js';
import {
    canAllocateSkill,
    canDeallocateSkill,
    getSkillPointsEarned,
    getTotalSkillPointsSpent,
} from '../../../game/skills/skillEffects.js';

const { Text, Title } = Typography;

const NODE_SIZE = 52;
const COL_GAP = 68;
const ROW_GAP = 76;
const BRANCH_GAP = 28;
const PAD_TOP = 36;
const PAD_SIDE = 20;

/** @type {Record<string, React.ComponentType<{ style?: React.CSSProperties }>>} */
const NODE_ICONS = {
    sharp_shots: AimOutlined,
    keen_eye: EyeOutlined,
    steady_aim: AimOutlined,
    quick_draw: ThunderboltOutlined,
    multishot: RocketOutlined,
    piercing_shots: AimOutlined,
    lethal_blows: StarOutlined,
    vitality: HeartOutlined,
    chain_strike: NodeIndexOutlined,
    chain_range: NodeIndexOutlined,
    chain_power: ThunderboltOutlined,
    ricochet: SyncOutlined,
    kindling: FireOutlined,
    toxin: BugOutlined,
    permafrost: CloudOutlined,
    empower_mastery: ExperimentOutlined,
    inferno_touch: FireOutlined,
    unlock_barrage: KeyOutlined,
    barrage_mastery: RocketOutlined,
    unlock_rapid: ThunderboltOutlined,
    rapid_mastery: ThunderboltOutlined,
    unlock_empower: ExperimentOutlined,
    unlock_frost: CloudOutlined,
    frost_mastery: CloudOutlined,
    unlock_venom: BugOutlined,
    venom_mastery: BugOutlined,
    unlock_spin: SyncOutlined,
    spin_mastery: SyncOutlined,
};

const BRANCH_BY_ID = Object.fromEntries(SKILL_BRANCHES.map((b) => [b.id, b]));

function buildLayout() {
    /** @type {Record<string, { x: number, y: number, branch: string }>} */
    const positions = {};
    let xOffset = PAD_SIDE;

    for (const branch of SKILL_BRANCHES) {
        const nodes = SKILL_NODES.filter((n) => n.branch === branch.id);
        const maxCol = Math.max(0, ...nodes.map((n) => n.column));
        const branchWidth = (maxCol + 1) * COL_GAP;

        for (const node of nodes) {
            positions[node.id] = {
                x: xOffset + node.column * COL_GAP + COL_GAP / 2,
                y: PAD_TOP + (node.tier - 1) * ROW_GAP + NODE_SIZE / 2,
                branch: branch.id,
            };
        }

        xOffset += branchWidth + BRANCH_GAP;
    }

    const width = xOffset + PAD_SIDE;
    const maxTier = Math.max(...SKILL_NODES.map((n) => n.tier), 1);
    const height = PAD_TOP + maxTier * ROW_GAP + NODE_SIZE;

    return { positions, width, height };
}

const LAYOUT = buildLayout();

function SkillTooltipContent({ node, rank, level, ranks, available }) {
    const maxed = rank >= node.maxRank;
    const alloc = canAllocateSkill(ranks, node.id, level);
    const dealloc = canDeallocateSkill(ranks, node.id);
    const branch = BRANCH_BY_ID[node.branch];
    const locked = rank === 0 && !alloc.ok;

    return (
        <div style={{ maxWidth: 280 }}>
            <Text strong style={{ color: '#fff', fontSize: 13 }}>
                {node.name}
            </Text>
            <div style={{ marginTop: 4 }}>
                <Tag style={{ margin: 0, marginRight: 6 }} color="purple">
                    {rank}/{node.maxRank}
                </Tag>
                {branch && (
                    <Tag style={{ margin: 0, color: branch.color, borderColor: branch.color }}>
                        {branch.label}
                    </Tag>
                )}
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, display: 'block', marginTop: 8 }}>
                {node.description}
            </Text>
            {(node.requires?.length ?? 0) > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginTop: 8 }}>
                    Requires:{' '}
                    {(node.requires ?? [])
                        .map((id) => {
                            const req = SKILL_NODES.find((n) => n.id === id);
                            const r = ranks[id] ?? 0;
                            return `${req?.name ?? id}${r > 0 ? '' : ' (not taken)'}`;
                        })
                        .join(', ')}
                </Text>
            )}
            {locked && alloc.reason && (
                <Text style={{ color: '#ffb464', fontSize: 11, display: 'block', marginTop: 8 }}>
                    <LockOutlined /> {alloc.reason}
                </Text>
            )}
            {!locked && !maxed && available <= 0 && (
                <Text style={{ color: '#ffb464', fontSize: 11, display: 'block', marginTop: 8 }}>
                    No skill points available
                </Text>
            )}
            {rank > 0 && !dealloc.ok && dealloc.reason && (
                <Text style={{ color: '#ffb464', fontSize: 11, display: 'block', marginTop: 8 }}>
                    {dealloc.reason}
                </Text>
            )}
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, display: 'block', marginTop: 10 }}>
                Left-click: add point · Right-click: remove point
            </Text>
        </div>
    );
}

function SkillTreeNode({
    node,
    pos,
    rank,
    ranks,
    level,
    available,
    onAllocate,
    onDeallocate,
}) {
    const branch = BRANCH_BY_ID[node.branch];
    const maxed = rank >= node.maxRank;
    const alloc = canAllocateSkill(ranks, node.id, level);
    const canBuy = alloc.ok && !maxed;
    const locked = rank === 0 && !canBuy;
    const Icon = NODE_ICONS[node.id] ?? FireOutlined;
    const r = NODE_SIZE / 2;

    let border = 'rgba(255,255,255,0.2)';
    let bg = 'rgba(0,0,0,0.5)';
    let iconColor = branch?.color ?? '#fff';

    if (maxed) {
        border = 'rgba(68,255,136,0.7)';
        bg = 'rgba(68,255,136,0.15)';
    } else if (rank > 0) {
        border = `${branch?.color ?? '#b674ff'}99`;
        bg = 'rgba(0,0,0,0.65)';
    } else if (canBuy) {
        border = `${branch?.color ?? '#b674ff'}cc`;
        bg = 'rgba(0,0,0,0.55)';
    } else if (locked) {
        border = 'rgba(255,255,255,0.12)';
        bg = 'rgba(0,0,0,0.35)';
        iconColor = 'rgba(255,255,255,0.35)';
    }

    const handleClick = (e) => {
        e.preventDefault();
        if (e.button === 0) onAllocate(node.id);
        else if (e.button === 2) onDeallocate(node.id);
    };

    return (
        <Tooltip
            title={
                <SkillTooltipContent
                    node={node}
                    rank={rank}
                    level={level}
                    ranks={ranks}
                    available={available}
                />
            }
            overlayStyle={{ zIndex: 10001 }}
            placement="top"
            mouseEnterDelay={0.15}
        >
            <div
                role="button"
                tabIndex={0}
                onMouseDown={handleClick}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                    position: 'absolute',
                    left: pos.x - r,
                    top: pos.y - r,
                    width: NODE_SIZE,
                    height: NODE_SIZE,
                    borderRadius: '50%',
                    border: `2px solid ${border}`,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canBuy || rank > 0 ? 'pointer' : 'default',
                    boxShadow: canBuy ? `0 0 12px ${branch?.color ?? '#b674ff'}44` : undefined,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    zIndex: 2,
                }}
            >
                <Icon style={{ fontSize: 22, color: iconColor }} />
                {rank > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            right: -4,
                            top: -4,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            background: maxed ? '#44ff88' : branch?.color ?? '#b674ff',
                            color: '#0b0b14',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                        }}
                    >
                        {rank}
                    </span>
                )}
                {locked && (
                    <LockOutlined
                        style={{
                            position: 'absolute',
                            right: 2,
                            bottom: 2,
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.55)',
                        }}
                    />
                )}
            </div>
        </Tooltip>
    );
}

function ConnectionLines({ positions, ranks }) {
    const lines = [];
    for (const node of SKILL_NODES) {
        const to = positions[node.id];
        if (!to) continue;
        for (const reqId of node.requires ?? []) {
            const from = positions[reqId];
            if (!from) continue;
            const active = (ranks[reqId] ?? 0) >= 1;
            lines.push({
                key: `${reqId}->${node.id}`,
                x1: from.x,
                y1: from.y,
                x2: to.x,
                y2: to.y,
                active,
            });
        }
    }

    return (
        <svg
            width={LAYOUT.width}
            height={LAYOUT.height}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 1 }}
        >
            {lines.map((ln) => {
                const midY = (ln.y1 + ln.y2) / 2;
                const d = `M ${ln.x1} ${ln.y1} C ${ln.x1} ${midY}, ${ln.x2} ${midY}, ${ln.x2} ${ln.y2}`;
                return (
                    <path
                        key={ln.key}
                        d={d}
                        fill="none"
                        stroke={ln.active ? 'rgba(180,120,255,0.55)' : 'rgba(255,255,255,0.12)'}
                        strokeWidth={ln.active ? 2 : 1.5}
                    />
                );
            })}
        </svg>
    );
}

function BranchLabels() {
    let xOffset = PAD_SIDE;
    const labels = [];

    for (const branch of SKILL_BRANCHES) {
        const nodes = SKILL_NODES.filter((n) => n.branch === branch.id);
        const maxCol = Math.max(0, ...nodes.map((n) => n.column));
        const branchWidth = (maxCol + 1) * COL_GAP;
        labels.push(
            <Text
                key={branch.id}
                style={{
                    position: 'absolute',
                    left: xOffset,
                    top: 8,
                    width: branchWidth,
                    textAlign: 'center',
                    color: branch.color,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    pointerEvents: 'none',
                }}
            >
                {branch.label}
            </Text>
        );
        xOffset += branchWidth + BRANCH_GAP;
    }

    return <>{labels}</>;
}

export default function SkillTreePanel({ isOpen }) {
    const [messageApi, contextHolder] = message.useMessage();
    const level = useGameStore((s) => s.player.pLevel);
    const ranks = useGameStore((s) => s.skills?.ranks ?? {});
    const allocateSkillPoint = useGameStore((s) => s.allocateSkillPoint);
    const deallocateSkillPoint = useGameStore((s) => s.deallocateSkillPoint);

    const earned = getSkillPointsEarned(level);
    const spent = getTotalSkillPointsSpent(ranks);
    const available = earned - spent;

    const positions = LAYOUT.positions;

    const onAllocate = useCallback(
        (nodeId) => {
            const res = allocateSkillPoint(nodeId);
            if (res?.ok) messageApi.success('Skill upgraded');
            else messageApi.warning(res?.reason ?? 'Cannot allocate');
        },
        [allocateSkillPoint, messageApi]
    );

    const onDeallocate = useCallback(
        (nodeId) => {
            const res = deallocateSkillPoint(nodeId);
            if (res?.ok) messageApi.info('Skill point refunded');
            else messageApi.warning(res?.reason ?? 'Cannot refund');
        },
        [deallocateSkillPoint, messageApi]
    );

    if (!isOpen) return null;

    return (
        <>
            {contextHolder}
            <Card
                className="bottom-right-float-card quest-panel-card"
                style={{ width: 920, maxHeight: '78vh', overflow: 'hidden' }}
                styles={{ body: { padding: 12, overflow: 'auto', maxHeight: 'calc(78vh - 56px)' } }}
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
                <div
                    style={{
                        position: 'relative',
                        width: LAYOUT.width,
                        height: LAYOUT.height,
                        margin: '0 auto',
                        minWidth: '100%',
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <BranchLabels />
                    <ConnectionLines positions={positions} ranks={ranks} />
                    {SKILL_NODES.map((node) => {
                        const pos = positions[node.id];
                        if (!pos) return null;
                        return (
                            <SkillTreeNode
                                key={node.id}
                                node={node}
                                pos={pos}
                                rank={ranks[node.id] ?? 0}
                                ranks={ranks}
                                level={level}
                                available={available}
                                onAllocate={onAllocate}
                                onDeallocate={onDeallocate}
                            />
                        );
                    })}
                </div>
            </Card>
        </>
    );
}
