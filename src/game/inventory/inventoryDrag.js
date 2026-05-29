export const INVENTORY_DRAG_MIME = 'application/x-voidhunt-inventory';

let inventoryDragDepth = 0;

/** While true, ability bar is raised above inventory so Q slot can receive drops. */
export function beginInventoryDragSession() {
    inventoryDragDepth += 1;
    if (inventoryDragDepth === 1) {
        document.documentElement.classList.add('inventory-dragging');
    }
}

export function endInventoryDragSession() {
    inventoryDragDepth = Math.max(0, inventoryDragDepth - 1);
    if (inventoryDragDepth === 0) {
        document.documentElement.classList.remove('inventory-dragging');
    }
}

/** @param {DataTransfer | null | undefined} dataTransfer */
export function isInventoryDragActive(dataTransfer) {
    if (!dataTransfer?.types) return false;
    const types = [...dataTransfer.types];
    return types.includes(INVENTORY_DRAG_MIME) || types.includes('text/plain');
}

/**
 * @typedef {{ source: 'inventory', slotIndex: number }} InventoryDragPayload
 */

/**
 * @param {number} slotIndex
 * @returns {string}
 */
export function buildInventoryDragPayload(slotIndex) {
    return JSON.stringify({ source: 'inventory', slotIndex });
}

/**
 * @param {DataTransfer | null | undefined} dataTransfer
 * @returns {InventoryDragPayload | null}
 */
export function parseInventoryDragPayload(dataTransfer) {
    if (!dataTransfer) return null;
    try {
        const raw =
            dataTransfer.getData(INVENTORY_DRAG_MIME) ||
            dataTransfer.getData('text/plain');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const slotIndex = Number(parsed?.slotIndex);
        if (parsed?.source === 'inventory' && Number.isInteger(slotIndex) && slotIndex >= 0) {
            return { source: 'inventory', slotIndex };
        }
    } catch {
        return null;
    }
    return null;
}
