// ground.js
import { Container, Graphics, TilingSprite, Assets } from 'pixi.js';
import { TILE, BIOME_COLORS } from './constants.js';

export async function buildGround(world, room) {
    const layer = new Container();
    world.addChild(layer);

    const tiles = room.size || 20;
    const half = Math.floor(tiles / 2) * TILE;
    const biome = BIOME_COLORS[room.biome];

    let texture = null;

    if (biome?.texture) {
        try {
            texture = await Assets.load(biome.texture);
        } catch {}
    }

    if (texture) {
        const sprite = new TilingSprite({
            texture,
            width: half * 2,
            height: half * 2
        });

        sprite.x = -half;
        sprite.y = -half;

        if (biome.tint) sprite.tint = biome.tint;

        layer.addChild(sprite);
    } else {
        const g = new Graphics();
        g.rect(-half, -half, half * 2, half * 2).fill(biome.base);
        layer.addChild(g);
    }

    // border
    const border = new Graphics();
    border
        .rect(-half, -half, half * 2, half * 2)
        .stroke({ width: 6, color: 0x000000, alpha: 0.3 });

    layer.addChild(border);

    return { layer, half };
}