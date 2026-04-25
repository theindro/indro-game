// world/textureAnalyzer.js - SIMPLE RECTANGLE COLLISION
const colliderCache = new Map();

export async function getOrGenerateColliders(texture, worldX, worldY, scale, propType) {
    if (!texture) return [];
    if (!propType.collision) return [];

    const cacheKey = `${propType.name}_${scale}`;

    if (colliderCache.has(cacheKey)) {
        const cached = colliderCache.get(cacheKey);
        return cached.map(c => ({
            ...c,
            x: worldX,
            y: worldY
        }));
    }

    // Get PNG dimensions
    const width = texture.width || texture.baseTexture?.width || 64;
    const height = texture.height || texture.baseTexture?.height || 64;

    // Apply scale and margin
    const scaledWidth = width * scale * (propType.margin || 1);
    const scaledHeight = height * scale * (propType.margin || 1);

    const collider = {
        x: worldX,
        y: worldY,
        width: scaledWidth,
        height: scaledHeight,
        collision: propType.collision,
        type: 'prop',
        propType: propType.name
    };

    const colliders = [collider];
    colliderCache.set(cacheKey, colliders);

    return colliders;
}

export function clearTextureCache() {
    colliderCache.clear();
}