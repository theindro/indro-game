/**
 * Returns the biome name for a world-space coordinate.
 * @param {number} x
 * @param {number} y
 * @returns {'forest'|'desert'|'ice'}
 */
export function getBiome(x, y) {
    const r = Math.sqrt(x * x + y * y);
    if (r < 260) return 'forest';
    const a = Math.atan2(y, x) * 180 / Math.PI;
    if (a > -65 && a < 65) return 'desert';
    if (a > 120 || a < -120) return 'ice';
    return 'forest';
}

export const BIOME_DISPLAY = {
    forest: { label: 'VERDANT FOREST', color: 'rgba(80,255,120,.6)' },
    desert: { label: 'SCORCHED SANDS', color: 'rgba(255,180,50,.6)' },
    ice:    { label: 'FROZEN WASTES',  color: 'rgba(100,220,255,.6)' },
    lava:    { label: 'LAVA WASTELAND',  color: 'rgba(255,100,100,0.6)' },
};