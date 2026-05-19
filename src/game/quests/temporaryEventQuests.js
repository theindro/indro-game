/** Ephemeral tracker quests (not in QUEST_DEFINITIONS / not persisted). */

export const TEMP_QUEST_TOTEM_WAVE = {
    id: 'temp_totem_wave',
    title: 'Ritual Totem',
    tag: 'Temporary Event',
};

/**
 * @param {'spawning'|'clearing'} phase
 * @param {object} ev Active totem wave state
 * @param {number} durationSec
 * @returns {{ id: string, title: string, tag: string, label: string, percent: number } | null}
 */
export function buildTotemWaveTemporaryQuest(phase, ev, durationSec) {
    if (!ev) return null;

    if (phase === 'spawning') {
        const left = Math.max(0, durationSec - ev.elapsed);
        const percent = Math.round((left / durationSec) * 100);
        return {
            ...TEMP_QUEST_TOTEM_WAVE,
            label: `${Math.ceil(left)}s left · ${ev.alive.size} alive`,
            percent,
        };
    }

    if (phase === 'clearing') {
        const initial = ev._clearingInitial ?? Math.max(ev.alive.size, 1);
        const killed = Math.max(0, initial - ev.alive.size);
        const percent = Math.min(100, Math.round((killed / initial) * 100));
        const label =
            ev.alive.size > 0
                ? `Clear ${ev.alive.size} remaining`
                : 'Reward chest ready';
        return {
            ...TEMP_QUEST_TOTEM_WAVE,
            label,
            percent,
        };
    }

    return null;
}
