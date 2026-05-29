import {
    beginAbilityBarDragSession,
    buildAbilityBarDragPayload,
    endAbilityBarDragSession,
    isAbilityBarDragActive,
    parseAbilityBarDragPayload,
} from '../../game/inventory/abilityBarDrag.js';
import { useGameStore } from '../../stores/gameStore.js';

/** Drag-and-drop between hotkey slots 1–6. */
export function useAbilityBarSlotDnD(barIndex) {
    const swapAbilityBarSlots = useGameStore((s) => s.swapAbilityBarSlots);

    const handleDragStart = (e) => {
        beginAbilityBarDragSession();
        const payload = buildAbilityBarDragPayload(barIndex);
        e.dataTransfer.setData('application/x-voidhunt-ability-bar', payload);
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        endAbilityBarDragSession();
    };

    const handleDragOver = (e) => {
        if (!isAbilityBarDragActive(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e) => {
        handleDragOver(e);
        e.currentTarget.classList.add('ability-bar-slot-drop-active');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('ability-bar-slot-drop-active');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('ability-bar-slot-drop-active');

        const payload = parseAbilityBarDragPayload(e.dataTransfer);
        if (payload?.source === 'ability_bar' && payload.barIndex !== barIndex) {
            swapAbilityBarSlots(payload.barIndex, barIndex);
        }
    };

    return {
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
    };
}
