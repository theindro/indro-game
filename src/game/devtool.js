// devtool.js
export function createDevTool(gameStore) {
    let isVisible = false;
    let panel = null;

    function createPanel() {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0,0,0,0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        `;

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>DEV TOOLS</strong>
                <button id="close-devtool" style="background:red; color:white; border:none; cursor:pointer;">X</button>
            </div>
            <div id="devtool-content"></div>
        `;

        document.body.appendChild(div);
        return div;
    }

    function updateContent() {
        if (!panel) return;

        const state = gameStore.getState();
        const stats = state.player.stats;

        const content = `
            <div style="margin-bottom: 10px;">
                <strong>PLAYER</strong><br>
                HP: <input type="number" id="dev-hp" value="${state.player.hp}" step="10" style="width:80px;"> / ${state.player.maxHp}<br>
                Gold: <input type="number" id="dev-gold" value="${state.inventory.gold}" step="100" style="width:80px;"><br>
                XP: <input type="number" id="dev-xp" value="${state.player.xp}" step="50" style="width:80px;"><br>
                Level: ${state.player.pLevel}
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>STATS</strong><br>
                Damage: <input type="number" id="dev-damage" value="${stats.damage}" step="5" style="width:80px;"><br>
                Projectiles: <input type="number" id="dev-projectiles" value="${stats.projectiles}" min="1" step="1" style="width:80px;"><br>
                Attack Speed: <input type="number" id="dev-attackSpeed" value="${stats.attackSpeed}" step="10" style="width:80px;"><br>
                Move Speed: <input type="number" id="dev-moveSpeed" value="${stats.moveSpeed}" step="0.1" style="width:80px;"><br>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>CHAIN</strong><br>
                Enable: <input type="checkbox" id="dev-chainEnabled" ${stats.chainEnabled ? 'checked' : ''}><br>
                Chain Count: <input type="number" id="dev-chainCount" value="${stats.chainCount}" min="0" step="1" style="width:80px;"><br>
                Chain Range: <input type="number" id="dev-chainRange" value="${stats.chainRange}" step="50" style="width:80px;"><br>
                Chain Damage: <input type="number" id="dev-chainDamage" value="${stats.chainDamage}" step="0.1" min="0" max="2" style="width:80px;"><br>
            </div>
            
            <div style="margin-bottom: 10px;">
    <strong>CRIT</strong><br>
    Crit Chance: <input type="number" id="dev-critChance" value="${stats.critChance}" min="0" max="100" step="5" style="width:80px;"> %<br>
    Crit Damage: <input type="number" id="dev-critDamage" value="${stats.critDamage}" min="50" max="500" step="25" style="width:80px;"> %<br>
</div>
            
            <div>
                <button id="dev-heal" style="background:green; color:white; border:none; cursor:pointer; margin-right:5px;">HEAL</button>
                <button id="dev-level" style="background:blue; color:white; border:none; cursor:pointer; margin-top:5px;">+1 LEVEL</button>
            </div>
        `;

        const contentDiv = panel.querySelector('#devtool-content');
        if (contentDiv) contentDiv.innerHTML = content;

        // Attach event listeners
        attachEvents();
    }

    function attachEvents() {
        // Player stats
        const hpInput = document.getElementById('dev-hp');
        if (hpInput) {
            hpInput.onchange = (e) => {
                gameStore.setState({ player: { ...gameStore.getState().player, hp: parseInt(e.target.value) } });
            };
        }

        const goldInput = document.getElementById('dev-gold');
        if (goldInput) {
            goldInput.onchange = (e) => {
                gameStore.setState({ player: { ...gameStore.getState().player, gold: parseInt(e.target.value) } });
            };
        }


// Add event listeners
        const critChanceInput = document.getElementById('dev-critChance');
        if (critChanceInput) {
            critChanceInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, critChance: parseInt(e.target.value) }
                    }
                });
            };
        }

        const critDamageInput = document.getElementById('dev-critDamage');
        if (critDamageInput) {
            critDamageInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, critDamage: parseInt(e.target.value) }
                    }
                });
            };
        }

        const xpInput = document.getElementById('dev-xp');
        if (xpInput) {
            xpInput.onchange = (e) => {
                gameStore.setState({ player: { ...gameStore.getState().player, xp: parseInt(e.target.value) } });
            };
        }

        // Stats
        const damageInput = document.getElementById('dev-damage');
        if (damageInput) {
            damageInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, damage: parseInt(e.target.value) }
                    }
                });
            };
        }

        const projectilesInput = document.getElementById('dev-projectiles');
        if (projectilesInput) {
            projectilesInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, projectiles: parseInt(e.target.value) }
                    }
                });
            };
        }

        const attackSpeedInput = document.getElementById('dev-attackSpeed');
        if (attackSpeedInput) {
            attackSpeedInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, attackSpeed: parseInt(e.target.value) }
                    }
                });
            };
        }

        const moveSpeedInput = document.getElementById('dev-moveSpeed');
        if (moveSpeedInput) {
            moveSpeedInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, moveSpeed: parseFloat(e.target.value) }
                    }
                });
            };
        }

        // Chain stats
        const chainEnabledInput = document.getElementById('dev-chainEnabled');
        if (chainEnabledInput) {
            chainEnabledInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, chainEnabled: e.target.checked }
                    }
                });
            };
        }

        const chainCountInput = document.getElementById('dev-chainCount');
        if (chainCountInput) {
            chainCountInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, chainCount: parseInt(e.target.value) }
                    }
                });
            };
        }

        const chainRangeInput = document.getElementById('dev-chainRange');
        if (chainRangeInput) {
            chainRangeInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, chainRange: parseInt(e.target.value) }
                    }
                });
            };
        }

        const chainDamageInput = document.getElementById('dev-chainDamage');
        if (chainDamageInput) {
            chainDamageInput.onchange = (e) => {
                const state = gameStore.getState();
                gameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, chainDamage: parseFloat(e.target.value) }
                    }
                });
            };
        }

        // Buttons
        const healBtn = document.getElementById('dev-heal');
        if (healBtn) {
            healBtn.onclick = () => {
                gameStore.getState().healPlayer(999);
                updateContent();
            };
        }

        const killBtn = document.getElementById('dev-kill');
        if (killBtn) {
            killBtn.onclick = () => {
                const state = gameStore.getState();
                if (state.roomManager) {
                    const room = state.roomManager.currentRoom;
                    if (room && room.mobs) {
                        room.mobs.forEach(mob => {
                            if (mob.c) state.world.removeChild(mob.c);
                        });
                        room.mobs.length = 0;
                    }
                }
            };
        }

        const levelBtn = document.getElementById('dev-level');
        if (levelBtn) {
            levelBtn.onclick = () => {
                const state = gameStore.getState();
                const newLevel = state.player.pLevel + 1;
                gameStore.setState({
                    player: {
                        ...state.player,
                        pLevel: newLevel,
                        xp: 0,
                        XPnext: Math.floor(state.player.XPnext * 1.5)
                    }
                });
                updateContent();
            };
        }
    }

    function toggle() {
        isVisible = !isVisible;
        if (!panel) {
            panel = createPanel();
        }

        if (isVisible) {
            updateContent();
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    // Setup F3 key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F3') {
            e.preventDefault();
            toggle();
        }
    });

    // Close button
    if (panel) {
        const closeBtn = panel.querySelector('#close-devtool');
        if (closeBtn) {
            closeBtn.onclick = () => {
                isVisible = false;
                if (panel) panel.style.display = 'none';
            };
        }
    }

    return { toggle };
}