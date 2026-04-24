import {useGameStore} from "../../stores/gameStore.js";
import {burst} from "../particles.js";
import {showFloat} from "../floatText.js";
import {audioManager} from "../utils/audioManager.js";

export function createPlayerController({hpBar, pBody, shakeRef, world, particles, floats}) {
    let hitTimeout = null;
    let lastHp = null; // Track previous HP to detect damage

    function updateHPBar(player) {
        if (!hpBar || hpBar.destroyed) return;

        const pct = Math.max(0, player.hp / player.maxHp); // Use pMaxHP, not maxHp

        hpBar.clear();

        if (pct > 0) {
            const color = pct > 0.5 ? 0x44ff88 :
                pct > 0.25 ? 0xffaa00 :
                    0xff2222;

            hpBar.rect(-19, -31, 38 * pct, 4).fill(color);
        }
    }

    function applyHitEffects(damage, hitType = 'default') {
        if (!damage || damage <= 0) return; // Only apply if damage actually happened

        // Get current position from store
        const player = useGameStore.getState().player;
        const playerX = player.x;
        const playerY = player.y;

        // Flash red
        if (pBody) {
            pBody.tint = 0xff3333;
            if (hitTimeout) clearTimeout(hitTimeout);
            hitTimeout = setTimeout(() => {
                if (pBody) pBody.tint = 0xffffff;
            }, 250);
        }

        // Screen shake
        if (shakeRef) {
            shakeRef.value = Math.min(15, (shakeRef.value || 0) + damage * 0.3);
        }

        // Particles burst at player position
        if (world && particles && pBody) {
            const color = hitType === 'ice' ? 0x00ccff : hitType === 'fire' ? 0xff4400 : hitType === 'poison' ? 0x44ff44 : 0xff6600;

            burst(world, particles, playerX, playerY, color, 8, 2);
        }

        // Floating text
        if (floats) {
            showFloat(floats, playerX, playerY - 30, `-${damage}`, 'red');
        }
    }

    // Initial update
    const initialPlayer = useGameStore.getState().player;
    lastHp = initialPlayer.hp;
    updateHPBar(initialPlayer);

    // Subscribe to store changes to detect damage
    const unsubscribe = useGameStore.subscribe((state) => {
        const currentPlayer = state.player;
        const currentHp = currentPlayer.hp;

        // Update HP bar always
        updateHPBar(currentPlayer);

        // Check if HP decreased (player took damage)
        if (currentHp < lastHp) {
            const damageAmount = lastHp - currentHp;

            audioManager.playSFX('/sounds/player-hit.mp3', 0.1)

            applyHitEffects(damageAmount, 'default');
        }

        // Update last HP for next comparison
        lastHp = currentHp;
    });

    // Return cleanup function
    return {
        destroy: unsubscribe
    };
}