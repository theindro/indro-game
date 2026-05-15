/**
 * Stable asset IDs from paths under src/assets/.
 * Examples:
 *   interactables/ores/iron_vein.png     → interactables.ores.iron_vein
 *   interactables/ores/iron_vein/texture.png → interactables.ores.iron_vein
 *   props/trees/oak.png                  → props.trees.oak
 */

const TEXTURE_BASENAMES = new Set(['texture', 'sprite', 'diffuse', 'albedo']);

/**
 * @param {string} relativePath path relative to src/assets (posix slashes)
 * @returns {string}
 */
export function assetIdFromPath(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    let parts = normalized.split('/').filter(Boolean);

    if (parts.length === 0) return 'unknown';

    const last = parts[parts.length - 1];
    const ext = last.match(/\.(png|jpe?g|webp|gif|json)$/i);
    if (ext) {
        parts[parts.length - 1] = last.slice(0, -ext[0].length);
    }

    if (parts[parts.length - 1] === 'meta') {
        parts.pop();
    }

    if (parts.length > 1 && TEXTURE_BASENAMES.has(parts[parts.length - 1])) {
        parts.pop();
    }

    return parts.join('.');
}

/**
 * @param {string} assetId
 * @returns {{ category: string, subpath: string }}
 */
export function parseAssetId(assetId) {
    const parts = assetId.split('.');
    return {
        category: parts[0] ?? 'misc',
        subpath: parts.slice(1).join('.'),
    };
}

/**
 * @param {string} relativePath
 * @returns {string|null} top-level content category (props, interactables, …)
 */
export function categoryFromPath(relativePath) {
    const id = assetIdFromPath(relativePath);
    return id.split('.')[0] || null;
}
