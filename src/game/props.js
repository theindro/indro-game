import {Texture, Sprite, Container, Graphics, Assets} from 'pixi.js';
import {BIOME_COLORS} from "./constants.js";

const SCALE = 1;
const MIN_PROP_DISTANCE = 40; // Minimum distance between prop centers

/* ── individual prop factories ── */

export async function scatterProps(world, colliders, room) {
    const half = (room.size || 20) * 32;
    const biome = BIOME_COLORS[room.biome];
    const count = room.propCount || 0;

    const props = biome?.props || [];
    const result = [];

    if (!props.length) return result;

    const textures = new Map();

    for (const p of props) {
        try {
            textures.set(p, await Assets.load(p));
        } catch {}
    }

    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 25) {
        const x = (Math.random() - 0.5) * half * 2;
        const y = (Math.random() - 0.5) * half * 2;

        if (Math.hypot(x, y) < 120) {
            attempts++;
            continue;
        }

        const path = props[Math.floor(Math.random() * props.length)];
        const tex = textures.get(path);

        const container = new Container();
        container.x = x;
        container.y = y;

        let radius = 40; // default safe value
        let offsetY = 0;

        if (tex) {
            const s = new Sprite(tex);
            s.anchor.set(0.5, 1); // bottom aligned
            container.addChild(s);

            // 🔥 REAL FIX: derive collision size from sprite
            radius = Math.max(tex.width, tex.height) * 0.4;

            // move collider upward slightly (important for tall props)
            offsetY = -tex.height * 0.4;
        }

        world.addChild(container);

        // 🔥 FIXED collider placement
        colliders.push({
            x,
            y: y + offsetY,
            r: radius
        });

        result.push({
            container,
            x,
            y,
            r: radius
        });

        placed++;
        attempts++;
    }

    return result;
}

// Modified to return the collision radius
async function createCustomProp(world, colliders, x, y, texturePath, biome) {
    const c = new Container();
    c.x = x;
    c.y = y;
    c.scale.set(SCALE);

    let collisionRadius = 15; // Default fallback radius

    try {
        const texture = await Assets.load(texturePath);
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.scale.set(SCALE);
        c.addChild(sprite);

        // Add biome-specific tint if needed
        if (biome.tint) {
            sprite.tint = biome.tint;
        }

        world.addChild(c);

        // Calculate collision radius based on sprite size
        collisionRadius = Math.max(sprite.width, sprite.height) / 2 * 0.7;
        const collisionYOffset = -sprite.height * 0.4; // Move up by 30% of sprite height

        colliders.push({ x, y: y + collisionYOffset, r: collisionRadius });

    } catch (error) {
        console.error(`Failed to load prop texture ${texturePath}:`, error);
        // Add a fallback visual
        const fallback = new Graphics();
        fallback.rect(-15, -30, 30, 30).fill(0x888888);
        c.addChild(fallback);
        world.addChild(c);
        colliders.push({ x, y, r: collisionRadius });
    }

    return collisionRadius;
}

