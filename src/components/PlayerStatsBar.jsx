// components/AbilityBar.jsx - Updated version
import { useState, useEffect, memo, useCallback } from 'react';
import { Tooltip, theme } from 'antd';
import {
    ThunderboltOutlined,
    FireOutlined,
    SafetyOutlined,
    CrownOutlined,
    PlusOutlined,
    QuestionOutlined
} from '@ant-design/icons';
import { useGameStore } from '../stores/gameStore';

// Separate component for ability slot to prevent re-renders
const AbilitySlot = memo(({ abilityNumber, ability, cooldownPercent, isReady, isActive, onAbilityClick }) => {
    const { token } = theme.useToken();

    const abilityIcons = {
        1: <QuestionOutlined />,
        2: <QuestionOutlined />,
        3: <QuestionOutlined />,
        4: <QuestionOutlined />,
    };

    const abilityColors = {
        1: 'grey',
        2: 'grey',
        3: 'grey',
        4: 'grey',
    };

    const formatCooldown = (cooldownEnd, now) => {
        const remaining = Math.max(0, cooldownEnd - now);
        const seconds = Math.ceil(remaining / 1000);
        return seconds > 0 ? `${seconds}s` : '';
    };

    const color = abilityColors[abilityNumber];
    const now = performance.now();
    const remaining = ability?.cooldownEnd ? Math.max(0, ability.cooldownEnd - now) : 0;
    const ready = remaining <= 0;

    return (
        <Tooltip
            title={
                <div>
                    <div><strong>{ability?.name}</strong> <span style={{ color }}>[{abilityNumber}]</span></div>
                    <div style={{ fontSize: 11 }}>{ability?.description}</div>
                    <div style={{ fontSize: 10, color: '#ffaa44', marginTop: 4 }}>
                        {ready ? '✅ Ready!' : `⏱️ Cooldown: ${formatCooldown(ability?.cooldownEnd, now)}`}
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>Level {ability?.level}/5</div>
                </div>
            }
            placement="top"
        >
            <div
                onClick={() => onAbilityClick(abilityNumber)}
                style={{
                    position: 'relative',
                    width: 65,
                    height: 65,
                    background: ready
                        ? `linear-gradient(135deg, #2a2a3e, #1a1a2e)`
                        : 'linear-gradient(135deg, #1a1a2e, #0a0a15)',
                    border: `2px solid ${ready ? color : '#444'}`,
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: ready ? 'pointer' : 'not-allowed',
                    transition: 'transform 0.1s ease',
                    transform: isActive ? 'scale(0.95)' : 'scale(1)',
                    opacity: ready ? 1 : 0.6,
                }}
            >
                <div style={{ fontSize: 28, color: ready ? color : '#888' }}>
                    {abilityIcons[abilityNumber]}
                </div>
                <div style={{
                    fontSize: 11,
                    color: '#aaa',
                    marginTop: 2,
                    fontWeight: 'bold',
                }}>
                    {abilityNumber}
                </div>

                {/* Cooldown overlay */}
                {!ready && remaining > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: color,
                    }}>
                        {Math.ceil(remaining / 1000)}
                    </div>
                )}

                {/* Cooldown progression ring */}
                {!ready && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${cooldownPercent}%`,
                            height: '100%',
                            background: color,
                            borderRadius: 2,
                        }} />
                    </div>
                )}

                {/* Level indicator */}
                {ability?.level > 1 && (
                    <div style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        background: color,
                        color: '#000',
                        fontSize: 9,
                        fontWeight: 'bold',
                        borderRadius: 10,
                        padding: '0 5px',
                        height: 16,
                        lineHeight: '16px',
                        minWidth: 18,
                        textAlign: 'center',
                    }}>
                        {ability.level}
                    </div>
                )}
            </div>
        </Tooltip>
    );
});

// Main component with optimized selectors
export default function AbilityBar() {
    const { token } = theme.useToken();

    // Subscribe to only what you need
    const playerHp = useGameStore(state => state.player?.hp);
    const playerMaxHp = useGameStore(state => state.player?.maxHp);
    const playerLevel = useGameStore(state => state.player?.pLevel);
    const playerXP = useGameStore(state => state.player?.pXP);
    const playerXPNext = useGameStore(state => state.player?.pXPNext);
    const gold = useGameStore(state => state.inventory?.gold);
    const kills = useGameStore(state => state.kills);
    const damage = useGameStore(state => state.player?.stats?.damage);
    const critChance = useGameStore(state => state.player?.stats?.critChance);
    const attackSpeed = useGameStore(state => state.player?.stats?.attackSpeed);
    const moveSpeed = useGameStore(state => state.player?.stats?.moveSpeed);

    // Subscribe to abilities
    const ability1 = useGameStore(state => state.abilities?.ability1);
    const ability2 = useGameStore(state => state.abilities?.ability2);
    const ability3 = useGameStore(state => state.abilities?.ability3);
    const ability4 = useGameStore(state => state.abilities?.ability4);

    const getAbilityCooldownPercent = useGameStore(state => state.getAbilityCooldownPercent);
    const useAbility = useGameStore(state => state.useAbility);

    const [activeAbility, setActiveAbility] = useState(null);

    const hpPercent = ((playerHp || 0) / (playerMaxHp || 100)) * 100;
    const xpPercent = ((playerXP || 0) / (playerXPNext || 100)) * 100;

    const handleAbilityClick = useCallback((abilityNumber) => {
        const success = useAbility(abilityNumber, Date.now());
        if (success) {
            setActiveAbility(abilityNumber);
            setTimeout(() => setActiveAbility(null), 300);
        }
    }, [useAbility]);

    const abilitiesMap = {
        1: ability1,
        2: ability2,
        3: ability3,
        4: ability4,
    };

    console.log('rerender stats');

    const cooldownPercents = {
        1: getAbilityCooldownPercent?.(1) || 0,
        2: getAbilityCooldownPercent?.(2) || 0,
        3: getAbilityCooldownPercent?.(3) || 0,
        4: getAbilityCooldownPercent?.(4) || 0,
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            pointerEvents: 'none',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                pointerEvents: 'auto',
            }}>
                {/* XP BAR - Above everything */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 20,
                    padding: '4px 16px',
                    border: `1px solid ${token?.colorPrimary || '#ffaa44'}40`,
                    width: 300,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                        <span style={{ color: '#44aaff' }}>⭐ XP</span>
                        <span style={{ color: '#88ccff', fontSize: 10 }}>Level {playerLevel || 1}</span>
                        <span style={{ color: '#88ccff', fontSize: 10 }}>{playerXP || 0}/{playerXPNext || 100}</span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: 6,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${xpPercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #44aaff, #88ccff)',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>

                {/* Main Bottom Bar - Health + Abilities + Stats */}
                <div style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-end',
                }}>
                    {/* LEFT SIDE - Health + Stats */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        border: `1px solid ${token?.colorPrimary || '#ffaa44'}40`,
                        minWidth: 170,
                    }}>
                        {/* Health Bar */}
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                                <span style={{ color: '#ff5555' }}>❤️ HEALTH</span>
                                <span style={{ color: '#ff8888', fontSize: 10 }}>{Math.floor(playerHp || 0)}/{playerMaxHp || 100}</span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: 6,
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 3,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${hpPercent}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #ff3300, #ff8888)',
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>

                        {/* Stats below HP */}
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: 6,
                        }}>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 11 }}>⚔️</span>
                                <span style={{ fontSize: 11, color: '#ffaa44' }}>{damage || 5}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 11 }}>🎯</span>
                                <span style={{ fontSize: 11, color: '#44aaff' }}>{critChance || 5}%</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 11 }}>⚡</span>
                                <span style={{ fontSize: 11, color: '#ffaa44' }}>{attackSpeed || 100}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 11 }}>💨</span>
                                <span style={{ fontSize: 11, color: '#44ff88' }}>{((moveSpeed || 0.4) * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* ABILITY SLOTS */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[1, 2, 3, 4].map((num) => (
                            <AbilitySlot
                                key={num}
                                abilityNumber={num}
                                ability={abilitiesMap[num]}
                                cooldownPercent={cooldownPercents[num]}
                                isReady={abilitiesMap[num]?.cooldownEnd <= performance.now()}
                                isActive={activeAbility === num}
                                onAbilityClick={handleAbilityClick}
                            />
                        ))}
                    </div>

                    {/* RIGHT SIDE - Resources */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        border: `1px solid ${token?.colorPrimary || '#ffaa44'}40`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        minWidth: 100,
                    }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12 }}>💰</span>
                            <span style={{ fontSize: 13, fontWeight: 'bold', color: '#ffcc44' }}>{gold || 0}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12 }}>👾</span>
                            <span style={{ fontSize: 12, fontWeight: 'bold', color: '#ffaa66' }}>{kills || 0}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12 }}>💎</span>
                            <span style={{ fontSize: 12, fontWeight: 'bold', color: '#aa66ff' }}>0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}