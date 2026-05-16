import { useGameStore } from '../../stores/gameStore.js';

const BAR_WIDTH = 420;
const BAR_HEIGHT = 14;

export default function BossHealthBar() {
    const encounter = useGameStore((s) => s.bossEncounter);
    const showStartScreen = useGameStore((s) => s.showStartScreen);

    if (showStartScreen || !encounter) return null;

    const pct = Math.max(0, Math.min(1, encounter.hp / encounter.maxHp));
    const pctLabel = Math.round(pct * 100);

    return (
        <div
            style={{
                position: 'fixed',
                top: 28,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                width: BAR_WIDTH,
                pointerEvents: 'none',
                userSelect: 'none',
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    fontFamily: 'Nunito, Georgia, serif',
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#f5e6c8',
                    textShadow: '0 2px 0 #000, 0 0 12px rgba(255, 80, 40, 0.6)',
                    marginBottom: 6,
                }}
            >
                {encounter.name}
            </div>

            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: BAR_HEIGHT,
                    borderRadius: 3,
                    background: 'linear-gradient(180deg, #1a0a0a 0%, #0d0505 100%)',
                    border: '2px solid #3d2817',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pct * 100}%`,
                        background: 'linear-gradient(180deg, #ff6644 0%, #cc2211 45%, #881108 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 200, 150, 0.35)',
                        transition: 'width 0.15s ease-out',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                        textShadow: '0 1px 2px #000',
                    }}
                >
                    {pctLabel}%
                </div>
            </div>
        </div>
    );
}
