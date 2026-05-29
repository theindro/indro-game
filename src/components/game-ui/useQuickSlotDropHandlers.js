import { useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore.js';
import {
    isInventoryDragActive,
    parseInventoryDragPayload,
} from '../../game/inventory/inventoryDrag.js';

/** Drop handlers for quick slot 1 (Q) — consumables from inventory drag. */
export function useQuickSlotDropHandlers() {
    const setQuickSlot1FromInventory = useGameStore((s) => s.setQuickSlot1FromInventory);

    const handleDragOver = useCallback((e) => {
        if (!isInventoryDragActive(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDragEnter = useCallback(
        (e) => {
            handleDragOver(e);
            e.currentTarget.classList.add('quick-slot-drop-active');
        },
        [handleDragOver]
    );

    const handleDragLeave = useCallback((e) => {
        e.currentTarget.classList.remove('quick-slot-drop-active');
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('quick-slot-drop-active');

            const payload = parseInventoryDragPayload(e.dataTransfer);
            if (!payload || payload.source !== 'inventory') return;

            setQuickSlot1FromInventory(payload.slotIndex);
        },
        [setQuickSlot1FromInventory]
    );

    return { handleDragOver, handleDragEnter, handleDragLeave, handleDrop };
}
