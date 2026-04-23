export default function ArenaHUD() {
    return (
        <div id="hud">
            {/* HP */}
            <div id="hp-panel">
                <div id="hp-icon"/>
                <div>
                    <div id="hp-label">100 / 100</div>
                    <div id="hp-track">
                        <div id="hp-fill"/>
                    </div>
                </div>
            </div>

            <div id="gold">
                <div id="gold-icon"/>
                <div>
                    <div id="gold-label">0</div>
                </div>
            </div>

            {/* KILLS */}
            <div id="kills-panel">
                <div id="kills-label">SLAIN</div>
                <div id="kills-count">0</div>
            </div>

            {/* BIOME */}
            <div id="biome-name">VERDANT FOREST</div>

            {/* XP */}
            <div id="xp-panel">
                <div id="level-badge">Level 1</div>
                <div id="xp-track">
                    <div id="xp-fill"></div>
                </div>
            </div>

            {/* BOSS */}
            <div id="boss-panel">
                <div id="boss-name">BOSS</div>
                <div id="boss-track">
                    <div id="boss-fill"></div>
                </div>
            </div>

            {/* CROSSHAIR */}
            <div id="crosshair"/>

            {/* OTHER */}
            <div id="levelup">Level Up!</div>
            <div id="boss-warning">⚠ BOSS APPROACHES ⚠</div>

            <div id="deathscreen">
                <div id="death-title">YOU DIED</div>
                <div id="death-sub">THE WORLD RECLAIMS ALL</div>
                <div id="death-kills"/>
                <button id="restart-btn" onClick={() => window.location.reload()}>
                    Rise Again
                </button>
            </div>

            <div id="pause-screen">
                    <div className="pause-content">
                        <h2>PAUSED</h2>

                        <button id="mute-music-btn" className="pause-btn">
                            🔈 Mute Music
                        </button>

                        <button id="resume-btn" className="pause-btn">
                            Resume Game
                        </button>
                    </div>
            </div>
        </div>
    );
}