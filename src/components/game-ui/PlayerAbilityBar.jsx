import React, {useEffect, useMemo, useState} from "react";
import {
    Avatar,
    Progress,
    Tooltip,
    Space,
    Divider,
    Badge, Row, Tag,
} from "antd";
import {
    AimOutlined,
    FireOutlined,
    LockOutlined,
    UserOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import {useGameStore} from "../../stores/gameStore.js";

const ABILITY_UNLOCK_LEVELS = {
    1: 3,
    2: 5,
    3: 10,
    4: 20,
};

const styles = {
    root: {
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "0 16px",
    },
    abilitySlot: {
        width: 52,
        height: 52,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s",
    },
};

const AbilitySlot = React.memo(function AbilitySlot({
                                                        ability,
                                                        index,
                                                        playerLevel
                                                    }) {
    const isLocked = playerLevel < ABILITY_UNLOCK_LEVELS[index];
    const playerDmg = useGameStore((s) => s.player?.stats?.damage);
    const isReady =
        !isLocked &&
        performance.now() >= (ability?.cooldownEnd ?? 0);

    const tooltipContent = isLocked ? (
        <div>
            <div style={{fontWeight: 600, fontSize: 14}}>{ability.name}</div>
            <div style={{color: "#aaa", fontSize: 12}}>
                Unlocks at level {ABILITY_UNLOCK_LEVELS[index]}
            </div>
        </div>
    ) : (
        <div style={{minWidth: 160}}>
            <div style={{fontWeight: 600, marginBottom: 4}}>{ability.name}</div>
            <div style={{fontSize: 12, color: "#bbb", lineHeight: 1.4, marginBottom: 8}}>
                {ability.description}
            </div>
            <Space style={{fontSize: 12, color: "#888"}}>
                <Tag>Lv {ability.level}</Tag>
                <Tag>CD {Number(ability.maxCooldown ?? 0).toFixed(1)}s</Tag>
                {ability.damageMultiplier && (
                    <Tag>Dmg {playerDmg * ability.damageMultiplier}</Tag>
                )}
            </Space>
        </div>
    );

    return (
        <Tooltip
            title={tooltipContent}
            placement="top"
            arrow={false}
            overlayStyle={{zIndex: 10001}}
        >
            <div
                style={{
                    ...styles.abilitySlot,
                    background: isLocked
                        ? "rgba(255,255,255,0.03)"
                        : isReady
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isLocked
                        ? "rgba(255,255,255,0.08)"
                        : isReady
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(255,255,255,0.15)"
                    }`,
                    opacity: isLocked ? 0.75 : 1,
                }}
            >
                {isLocked ? (
                    <LockOutlined style={{fontSize: 20, color: "#555"}}/>
                ) : (
                    <img
                        src={ability.icon}
                        alt={ability.name}
                        width={28}
                        height={28}
                        style={{filter: isReady ? "none" : "grayscale(0.6)"}}
                    />
                )}

                {/* Cooldown Overlay */}
                {!isLocked && !isReady && (
                    <CooldownOverlay cooldownEnd={ability.cooldownEnd}/>
                )}

                {/* Hotkey / Level */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        color: isLocked ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.4)",
                    }}
                >
                    {isLocked ? `Lv${ABILITY_UNLOCK_LEVELS[index]}` : index}
                </div>
            </div>
        </Tooltip>
    );
});

export default function AbilityBar() {
    const playerLevel = useGameStore((s) => s.player.pLevel);
    const playerXp = useGameStore((s) => s.player.xp);
    const playerXpNext = useGameStore((s) => s.player.XPnext);
    const playerHp = useGameStore((s) => s.player.hp);
    const playerMaxHp = useGameStore((s) => s.player.maxHp);
    const playerStats = useGameStore((s) => s.player.stats);

    const attackCooldown = useGameStore((s) => s.player.stats.attackCooldown);
    const dashCooldown = useGameStore(s => s.player.stats.dashCooldown);

    const abilities = useGameStore((s) => s.abilities);
    const basicAttack = useGameStore((s) => s.basicAttack);
    const dash = useGameStore((s) => s.dash);

    const abilityList = useMemo(
        () => [abilities?.ability1, abilities?.ability2, abilities?.ability3, abilities?.ability4],
        [abilities]
    );

    if (!abilities?.ability1) return null;

    return (
        <div style={styles.root}>
            <div>
                <div>
                    <Row type="flex" justify="space-between" style={{fontSize: 12, opacity: 0.7}}>
                        <span>XP</span>
                        <span>{Math.round(playerXp ?? 0)} / {playerXpNext}</span>
                    </Row>
                    <Progress
                        percent={((playerXp ?? 0) / (playerXpNext ?? 100)) * 100}
                        showInfo={false}
                        strokeColor="#f5a623"
                        size="small"
                    />
                </div>
            </div>
            <Divider/>
            <div style={styles.bar}>
                <Space align="center" size={16}>
                    {/* Avatar + Level */}
                    <Badge
                        count={playerLevel}
                        color="#0a0c10"
                        style={{
                            color: "#ddd",
                            fontWeight: 700,
                            fontSize: 12,
                            border: "1px solid rgba(255,255,255,0.2)",
                        }}
                    >
                        <Avatar
                            size={52}
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            ⚔
                        </Avatar>
                    </Badge>

                    {/* HP & XP Bars - Stacked to the right of avatar */}
                    <Space direction="vertical" size={6} style={{width: 170}}>
                        <div>
                            <Progress
                                percent={((playerHp ?? 0) / (playerMaxHp ?? 100)) * 100}
                                showInfo={false}
                                strokeColor="#3b9e75"
                                size="small"
                            />
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 12,
                                color: "#aaa",
                                marginTop: 2
                            }}>
                                <span>HP</span>
                                <span>{Math.round(playerHp ?? 0)} / {playerMaxHp}</span>
                            </div>
                        </div>
                    </Space>

                    <Divider type="vertical" style={{height: 64, background: "rgba(255,255,255,0.1)"}}/>

                    {/* Main Abilities */}
                    <Space size={8}>
                        {abilityList.map((ability, i) =>
                            ability ? (
                                <AbilitySlot
                                    key={i}
                                    ability={ability}
                                    index={i + 1}
                                    playerLevel={playerLevel}
                                />
                            ) : null
                        )}
                    </Space>

                    <Divider type="vertical" style={{height: 64, background: "rgba(255,255,255,0.1)"}}/>

                    {/* Basic Attack + Dash */}
                    <Space size={8}>
                        <AbilitySlot
                            ability={{
                                name: "Basic Attack",
                                icon: "/icons/attack.png",
                                cooldownEnd: basicAttack?.cooldownEnd ?? 0,
                                maxCooldown: attackCooldown,
                                description: "Standard attack",
                                level: 1,
                            }}
                            index="Basic"
                            playerLevel={playerLevel}
                        />

                        <AbilitySlot
                            ability={{
                                name: "Dash",
                                icon: "/icons/dash.png",
                                cooldownEnd: dash?.cooldownEnd ?? 0,
                                maxCooldown: dashCooldown,
                                description: "Quick dash",
                                level: 1,
                            }}
                            index="Dash"
                            playerLevel={playerLevel}
                        />
                    </Space>
                </Space>
            </div>
        </div>
    );
}

function CooldownOverlay({cooldownEnd}) {
    const [now, setNow] = useState(performance.now());

    useEffect(() => {
        let frame;

        const update = () => {
            setNow(performance.now());
            frame = requestAnimationFrame(update);
        };

        frame = requestAnimationFrame(update);

        return () => cancelAnimationFrame(frame);
    }, []);

    if (now >= cooldownEnd) return null;

    const remaining = (cooldownEnd - now) / 1000;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                borderRadius: 12,
            }}
        >
            {remaining.toFixed(1)}
        </div>
    );
}