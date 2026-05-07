import React, {useEffect, useMemo, useRef, useState} from "react";
import {Tooltip} from "antd";
import {
    AimOutlined,
    FireOutlined,
    LockOutlined, UserOutlined,
} from "@ant-design/icons";
import {useGameStore} from "../stores/gameStore";

const ABILITY_ICONS = {
    "Arrow Barrage": <FireOutlined/>,
    "Rapid Fire": <LockOutlined/>,
    "Empower": <LockOutlined/>,
    "Frost Arrow": <LockOutlined/>,
    "basic": <AimOutlined/>,
    "dash": <UserOutlined/>,
};

const ABILITY_UNLOCK_LEVELS = {
    1: 1,
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
    },
    bar: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 14px",
        borderRadius: 14,
        background: "rgba(10, 12, 16, 0.82)",
        border: "0.5px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 0.5px 0 rgba(255,255,255,0.07)",
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.05)",
        border: "0.5px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        fontSize: 18,
        color: "rgba(255,255,255,0.5)",
    },
    levelBadge: {
        position: "absolute",
        bottom: -4,
        right: -4,
        background: "#0a0c10",
        border: "0.5px solid rgba(255,255,255,0.15)",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
        padding: "0 5px",
        lineHeight: "15px",
        letterSpacing: 0.2,
    },
    stats: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        width: 140,
    },
    statRow: {
        display: "flex",
        alignItems: "center",
        gap: 6,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.3)",
        width: 16,
        letterSpacing: 0.3,
        flexShrink: 0,
    },
    track: {
        flex: 1,
        height: 4,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 99,
        overflow: "hidden",
    },
    statVal: {
        fontSize: 10,
        color: "rgba(255,255,255,0.3)",
        minWidth: 56,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
    },
    divider: {
        width: "0.5px",
        height: 40,
        background: "rgba(255,255,255,0.08)",
        flexShrink: 0,
    },
    slots: {
        display: "flex",
        gap: 5,
        alignItems: "center",
    },
};

function StatBar({label, value, max, fillColor}) {
    const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
    return (
        <div style={styles.statRow}>
            <span style={styles.statLabel}>{label}</span>
            <div style={styles.track}>
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: fillColor,
                        borderRadius: 99,
                        transition: "width 0.35s ease",
                    }}
                />
            </div>
            <span style={styles.statVal}>
                {Math.round(value)} / {max}
            </span>
        </div>
    );
}

function AbilitySlot({ability, index, playerLevel}) {
    const [, setTick] = useState(0);
    useRAF(() => setTick(t => t + 1));

    const isLocked = playerLevel < ABILITY_UNLOCK_LEVELS[index];
    const now = performance.now();
    const isReady = !isLocked && now >= ability.cooldownEnd;
    const remaining = isReady ? 0 : (ability.cooldownEnd - now) / 1000;

    const tooltipContent = isLocked ? (
        <div style={{minWidth: 140}}>
            <div style={{fontWeight: 600, fontSize: 13, marginBottom: 3, color: "#fff"}}>
                {ability.name}
            </div>
            <div style={{fontSize: 11, color: "rgba(255,255,255,0.4)"}}>
                Unlocks at level {ABILITY_UNLOCK_LEVELS[index]}
            </div>
        </div>
    ) : (
        <div style={{minWidth: 140, zIndex: 5}}>
            <div style={{fontWeight: 600, fontSize: 13, marginBottom: 3, color: "#fff"}}>
                {ability.name}
            </div>
            <div style={{fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 8, lineHeight: 1.4}}>
                {ability.description}
            </div>
            <div style={{display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.35)"}}>
                <span>Lv {ability.level}</span>
                <span>CD {(ability.maxCooldown / 1000).toFixed(1)}s</span>
            </div>
        </div>
    );

    return (
        <Tooltip title={tooltipContent} placement="top" arrow={false}  overlayStyle={{ zIndex: 10001 }}>
            <div style={{
                position: "relative",
                width: 48,
                height: 48,
                borderRadius: 10,
                background: isLocked
                    ? "rgba(255,255,255,0.02)"
                    : isReady
                        ? "rgba(255,255,255,0.07)"
                        : "rgba(255,255,255,0.03)",
                border: isLocked
                    ? "0.5px solid rgba(255,255,255,0.04)"
                    : isReady
                        ? "0.5px solid rgba(255,255,255,0.18)"
                        : "0.5px solid rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLocked ? "default" : "pointer",
                transition: "border-color 0.15s, background 0.15s",
                overflow: "hidden",
                flexShrink: 0,
                opacity: isLocked ? 1 : isReady ? 1 : 0.5,
            }}>
                {/* Icon or lock */}
                <span style={{
                    fontSize: isLocked ? 16 : 20,
                    color: isLocked
                        ? "rgba(255,255,255,0.2)"
                        : isReady
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.25)",
                    display: "flex",
                    transition: "color 0.15s",
                }}>
                    {isLocked ? <LockOutlined /> : (ABILITY_ICONS[ability.name] || ability.icon)}
                </span>

                {/* Cooldown overlay */}
                {!isLocked && !isReady && (
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.7)",
                        letterSpacing: -0.3,
                    }}>
                        {remaining.toFixed(1)}
                    </div>
                )}

                {/* Unlock level badge — shown instead of hotkey when locked */}
                {isLocked ? (
                    <span style={{
                        position: "absolute",
                        bottom: 3,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        fontSize: 9,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.2)",
                        lineHeight: 1,
                    }}>
                        lv{ABILITY_UNLOCK_LEVELS[index]}
                    </span>
                ) : (
                    <span style={{
                        position: "absolute",
                        bottom: 3,
                        left: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.25)",
                        lineHeight: 1,
                    }}>
                        {index}
                    </span>
                )}
            </div>
        </Tooltip>
    );
}

function useRAF(callback) {
    const rafRef = useRef(null);
    const cbRef = useRef(callback);
    cbRef.current = callback;

    useEffect(() => {
        const tick = () => {
            cbRef.current();
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);
}


export default function AbilityBar() {
    const ability1 = useGameStore((s) => s.abilities?.ability1);
    const ability2 = useGameStore((s) => s.abilities?.ability2);
    const ability3 = useGameStore((s) => s.abilities?.ability3);
    const ability4 = useGameStore((s) => s.abilities?.ability4);

    const playerHp = useGameStore((s) => s.player?.hp);
    const playerMaxHp = useGameStore((s) => s.player?.maxHp);
    const playerXP = useGameStore((s) => s.player?.xp);
    const playerXPNext = useGameStore((s) => s.player?.XPnext);
    const playerLevel = useGameStore((s) => s.player?.pLevel);

    const abilities = useMemo(
        () => [ability1, ability2, ability3, ability4],
        [ability1, ability2, ability3, ability4]
    );

    if (!ability1) return null;

    return (
        <div style={styles.root}>
            <div style={styles.bar}>
                {/* Avatar + level */}
                <div style={styles.avatar}>
                    ⚔
                    <div style={styles.levelBadge}>{playerLevel}</div>
                </div>

                {/* HP + XP bars */}
                <div style={styles.stats}>
                    <StatBar
                        label="HP"
                        value={playerHp ?? 0}
                        max={playerMaxHp ?? 100}
                        fillColor="#3b9e75"
                    />
                    <StatBar
                        label="XP"
                        value={playerXP ?? 0}
                        max={playerXPNext ?? 100}
                        fillColor="orange"
                    />
                </div>

                <div style={styles.divider}/>

                {/* Ability slots */}
                <div style={styles.slots}>
                    {abilities.map((ability, i) => {
                        if (!ability) return null;
                        return (
                            <AbilitySlot
                                key={i}
                                ability={ability}
                                index={i + 1}
                                playerLevel={playerLevel}
                            />
                        );
                    })}
                </div>


                <div style={styles.divider}/>

                {/* Basic attack + Dash — smaller, visually secondary */}
                <div style={{...styles.slots, gap: 5}}>
                    <AbilitySlot
                        key={'dash'}
                        ability={{name: 'dash'}}
                        playerLevel={playerLevel}
                    />
                    <AbilitySlot
                        key={'basic'}
                        ability={{name: 'basic'}}
                        playerLevel={playerLevel}
                    />
                </div>
            </div>
        </div>
    );
}