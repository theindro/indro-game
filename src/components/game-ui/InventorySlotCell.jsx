import React from 'react';
import {
    isInventoryDragActive,
    parseInventoryDragPayload,
} from '../../game/inventory/inventoryDrag.js';

/**
 * Drop target for one inventory grid cell.
 */
export default function InventorySlotCell({
    slotIndex,
    isEmpty,
    onDropSlot,
    children,
}) {
    const handleDragOver = (e) => {
        if (!isInventoryDragActive(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e) => {
        if (!isInventoryDragActive(e.dataTransfer)) return;
        e.preventDefault();
        e.currentTarget.classList.add('inventory-slot-drop-active');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('inventory-slot-drop-active');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('inventory-slot-drop-active', 'inventory-slot-drop-target');

        const payload = parseInventoryDragPayload(e.dataTransfer);
        if (!payload) return;

        if (payload.source === 'inventory') {
            if (payload.slotIndex === slotIndex) return;
            onDropSlot?.(payload.slotIndex, slotIndex);
        }
    };

    return (
        <div
            className={
                isEmpty
                    ? 'inventory-slot-cell inventory-slot-cell--empty'
                    : 'inventory-slot-cell'
            }
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-slot-index={slotIndex}
        >
            {children}
        </div>
    );
}
