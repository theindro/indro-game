import {Texture, Sprite, Container, Graphics, Assets} from 'pixi.js';
import {BIOME_COLORS} from "./constants.js";

const SCALE = 1;
const MIN_PROP_DISTANCE = 40; // Minimum distance between prop centers

/* ── individual prop factories ── */

export async function scatterProps(world, colliders, room) {
    const half = (room.size || 20) * 32;
    const biome = room.biome;
    const count = room.propCount || 0;
    const biomeConfig = BIOME_COLORS[biome];

    const availableProps = biomeConfig?.props || [];
    if (availableProps.length === 0) {
        console.log('no props for biome');
        return;
    }

    const propPositions = [];
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 30;

    // Preload textures to get sizes before placing
    const propSizes = new Map();
    for (const propPath of availableProps) {
        try {
            const texture = await Assets.load(propPath);
            propSizes.set(propPath, {
                width: texture.width,
                height: texture.height,
                radius: Math.max(texture.width, texture.height) / 2 * 0.7
            });
        } catch (error) {
            console.error(`Failed to load prop texture ${propPath}:`, error);
            propSizes.set(propPath, { radius: 20 }); // Default size
        }
    }

    while (placed < count && attempts < maxAttempts) {
        const ax = (Math.random() - 0.5) * half * 2;
        const ay = (Math.random() - 0.5) * half * 2;

        // Keep center clear for player
        if (Math.hypot(ax, ay) < 80) {
            attempts++;
            continue;
        }

        // Randomly select a prop type
        const propPath = availableProps[Math.floor(Math.random() * availableProps.length)];
        const propSize = propSizes.get(propPath);
        const minDistance = propSize.radius * 2 + 10; // Dynamic minimum distance

        // Check collision with existing props
        let overlaps = false;
        for (const pos of propPositions) {
            const distance = Math.hypot(pos.x - ax, pos.y - ay);
            const requiredDistance = (pos.radius + propSize.radius) * 1.2; // 20% padding
            if (distance < requiredDistance) {
                overlaps = true;
                break;
            }
        }

        // Optional: Check collision with world boundaries
        if (Math.abs(ax) + propSize.radius > half || Math.abs(ay) + propSize.radius > half) {
            overlaps = true;
        }

        if (!overlaps) {
            await createCustomProp(world, colliders, ax, ay, propPath, biome);
            propPositions.push({ x: ax, y: ay, radius: propSize.radius });
            placed++;
        }

        attempts++;
    }

    console.log(`Placed ${placed}/${count} props in ${biome} biome (${attempts} attempts)`);
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

