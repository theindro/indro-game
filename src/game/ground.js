import { Assets, Container, Graphics, TilingSprite } from 'pixi.js';
import { TILE, BIOME_COLORS } from './constants.js';

export async function buildGround(app, world, room) {
    const groundLayer = new Container();
    world.addChild(groundLayer);

    const tiles = room.size || 20;
    const halfTiles = Math.floor(tiles / 2);
    const halfWorld = halfTiles * TILE;
    const biome = room.biome;
    const biomeConfig = BIOME_COLORS[biome];

    // Try to load biome texture if it exists
    if (biomeConfig?.texture) {
        try {
            const texture = await Assets.load(biomeConfig.texture);
            const tilingSprite = new TilingSprite({
                texture: texture,
                width: halfWorld * 2,
                height: halfWorld * 2
            });
            tilingSprite.x = -halfWorld;
            tilingSprite.y = -halfWorld;

            // Apply tint based on biome for variation
            if (biomeConfig.tint) {
                tilingSprite.tint = biomeConfig.tint;
            }

            groundLayer.addChild(tilingSprite);

            // Add biome-specific overlay effects
            addBiomeOverlay(groundLayer, halfWorld, biome);

        } catch (error) {
            console.warn(`Failed to load texture for ${biome}, using graphics fallback:`, error);
            buildGraphicsGround(groundLayer, halfTiles, halfWorld, biome);
        }
    } else {
        // No texture defined, use graphics
        buildGraphicsGround(groundLayer, halfTiles, halfWorld, biome);
    }

    // Add room border
    const border = new Graphics();
    border.rect(-halfWorld, -halfWorld, halfWorld * 2, halfWorld * 2)
        .stroke({ width: 6, color: 0x000000, alpha: 0.35 });
    groundLayer.addChild(border);

    return {
        layer: groundLayer,
        halfWorld
    };
}

// Helper function for biome-specific overlays
function addBiomeOverlay(groundLayer, halfWorld, biome) {
    const overlay = new Graphics();

    switch(biome) {
        case 'lava':
            // Add subtle lava glow
            //overlay.circle(0, 0, halfWorld).fill({ color: 0xff3300, alpha: 0.1 });
            break;
        case 'ice':
            // Add frost overlay
            overlay.rect(-halfWorld, -halfWorld, halfWorld * 2, halfWorld * 2).fill({ color: 0xaaddff, alpha: 0.05 });
            break;
        case 'desert':
            // Add heat haze effect
            overlay.rect(-halfWorld, -halfWorld, halfWorld * 2, halfWorld * 2).fill({ color: 0xffaa66, alpha: 0.05 });
            break;
        case 'forest':
            // Add shadow overlay
            overlay.rect(-halfWorld, -halfWorld, halfWorld * 2, halfWorld * 2).fill({ color: 0x226622, alpha: 0.08 });
            break;
    }

    groundLayer.addChild(overlay);
}

// Improved graphics ground with better visuals
function buildGraphicsGround(groundLayer, halfTiles, halfWorld, biome) {
    const biomeConfig = BIOME_COLORS[biome];

    for (let gx = -halfTiles; gx < halfTiles; gx++) {
        for (let gy = -halfTiles; gy < halfTiles; gy++) {
            const wx = gx * TILE;
            const wy = gy * TILE;
            const seed = (gx * 73856093) ^ (gy * 19349663);

            const g = new Graphics();

            // Base tile
            g.rect(0, 0, TILE, TILE).fill(biomeConfig.base);

            // Add texture variation
            const variation = ((seed >> 16) & 255) / 255;
            const darkenAmount = 0.7 + variation * 0.3;

            // Biome-specific details
            switch(biome) {
                case 'forest':
                    // Grass patches
                    if ((seed & 15) < 3) {
                        g.circle(TILE/2, TILE/2, 5 + (seed & 7))
                            .fill(0x2a6a32);
                    }
                    // Flowers
                    if ((seed & 255) < 10) {
                        g.circle(5 + (seed & 20), 5 + ((seed>>4) & 20), 2)
                            .fill(0xffaa44);
                    }
                    break;

                case 'desert':
                    // Sand ripples
                    for (let i = 0; i < 3; i++) {
                        g.moveTo(0, TILE * 0.3 + i * 15)
                            .quadraticCurveTo(TILE/2, TILE * 0.2 + i * 15, TILE, TILE * 0.3 + i * 15)
                            .stroke({ width: 1, color: 0xd4a055, alpha: 0.3 });
                    }
                    break;

                case 'ice':
                    // Ice crystals
                    if ((seed & 31) < 5) {
                        const cx = 5 + (seed & 20);
                        const cy = 5 + ((seed>>4) & 20);
                        g.moveTo(cx, cy-3)
                            .lineTo(cx+2, cy)
                            .lineTo(cx, cy+3)
                            .lineTo(cx-2, cy)
                            .fill(0xaaddff);
                    }
                    break;

                case 'lava':
                    // Lava cracks
                    if ((seed & 15) < 4) {
                        g.moveTo(0, TILE/2)
                            .lineTo(TILE, TILE/2)
                            .stroke({ width: 2 + (seed & 3), color: 0xff4400, alpha: 0.7 });
                        g.moveTo(TILE/2, 0)
                            .lineTo(TILE/2, TILE)
                            .stroke({ width: 2 + (seed & 3), color: 0xff4400, alpha: 0.7 });
                    }
                    break;
            }

            g.x = wx;
            g.y = wy;
            groundLayer.addChild(g);
        }
    }
}