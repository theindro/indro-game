// game/dropManager.js
import { Container, Sprite, Graphics } from 'pixi.js';
import { ItemDatabase, DropTables } from '../items.js';
import { assetManager } from './assetManager.js';

export class DropManager {
    constructor(world) {
        this.world = world;
    }

    rollDrop(mobType = 'default', isBoss = false) {
        const drops = [];
        const table = isBoss ? DropTables.boss :
            mobType === 'elite' ? DropTables.elite :
                DropTables.default;

        // Roll gold
        if (Math.random() * 100 < table.gold.chance) {
            const amount = table.gold.min + Math.floor(Math.random() * (table.gold.max - table.gold.min + 1));
            drops.push({ type: 'gold', amount });
        }

        // Roll heart (healing)
        if (Math.random() < 0.1) { // 10% chance
            drops.push({ type: 'hp', amount: 20 });
        }

        // Roll items
        for (const itemDrop of table.items) {
            if (Math.random() * 100 < itemDrop.chance) {
                const quantity = itemDrop.minQty + Math.floor(Math.random() * (itemDrop.maxQty - itemDrop.minQty + 1));
                const item = { ...ItemDatabase[itemDrop.id] };
                if (item) {
                    drops.push({ type: 'item', item, quantity });
                }
            }
        }

        return drops;
    }

    // Create shadow under the drop
    createShadow() {
        const pShadow = new Graphics();
        pShadow.ellipse(5, 30, 13, 5).fill({ color: 0, alpha: 0.28 });
        return pShadow;
    }

    createDropVisual(x, y, drop) {
        const container = new Container();
        container.x = x;
        container.y = y;

        if (drop.type === 'gold') {
            // Gold drop visual
            const texture = assetManager.getTexture('drops_drop_gold');
            if (texture) {
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5);
                sprite.scale.set(0.5);
                container.addChild(sprite);
            } else {
                // Fallback graphics
                const graphics = new Graphics();
                graphics.circle(0, 0, 4).fill({ color: 0xffcc44 });
                graphics.circle(0, 0, 2).fill({ color: 0xffaa00 });
                container.addChild(graphics);
            }
        }
        else if (drop.type === 'hp') {
            // Heart drop visual
            const graphics = new Graphics();
            graphics.circle(-3.5, -2, 5).fill({ color: 0xff2255 });
            graphics.circle(3.5, -2, 5).fill({ color: 0xff2255 });
            graphics.moveTo(-8, 1).lineTo(8, 1).lineTo(0, 10).closePath().fill({ color: 0xff2255 });
            container.addChild(graphics);
        }
        else if (drop.type === 'item' && drop.item) {
            // Add shadow under the drop
            const shadow = this.createShadow();
            container.addChild(shadow);

            // Item drop visual - use textureId directly
            const texture = assetManager.getTexture(drop.item.textureId);

            console.log(`Looking for texture: ${drop.item.textureId}`);
            console.log('Available textures:', Array.from(assetManager.textures.keys()));

            if (texture) {
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.1);
                sprite.scale.set(0.1);
                container.addChild(sprite);
                console.log(`✓ Created sprite for ${drop.item.name}`);
            } else {
                // Fallback
                console.warn(`No texture for ${drop.item.name}, using fallback`);
                const graphics = new Graphics();
                const rarityColor = drop.item.rarity?.color || '#ffaa44';

                graphics.rect(-8, -8, 16, 16).fill({ color: rarityColor });

                graphics.rect(-6, -6, 12, 12).fill({ color: rarityColor });

                container.addChild(graphics);
            }
        }

        this.world.addChild(container);
        return container;
    }

    createDrop(x, y, drop) {
        const container = this.createDropVisual(x, y, drop);

        // Add physics
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let bob = Math.random() * Math.PI * 2;
        let floatOffset = 0;

        const update = () => {
            // Apply gravity and friction
            vx *= 0.95;
            vy *= 0.95;
            container.x += vx;
            container.y += vy;

            // Bobbing animation
            bob += 0.08;
            floatOffset += 0.05;
            container.y += Math.sin(bob) * 0.28;

            // Rotation for items
            if (drop.type === 'item') {
                container.rotation = Math.sin(floatOffset) * 0.1;
            }
        };

        const destroy = () => {
            if (container.parent) {
                this.world.removeChild(container);
            }
            container.destroy();
        };

        return {
            container,
            type: drop.type,
            amount: drop.amount,
            item: drop.item,
            vx,
            vy,
            bob,
            update,
            destroy,
        };
    }

    spawnDrops(world, x, y, mobType = 'default', isBoss = false) {
        const drops = this.rollDrop(mobType, isBoss);
        const dropObjects = [];

        for (const drop of drops) {
            if (drop.type === 'gold') {
                // Spawn multiple gold coins
                for (let i = 0; i < drop.amount; i++) {
                    dropObjects.push(this.createDrop(x, y, { type: 'gold', amount: 1 }));
                }
            } else if (drop.type === 'hp') {
                dropObjects.push(this.createDrop(x, y, { type: 'hp', amount: drop.amount }));
            } else if (drop.type === 'item') {
                for (let i = 0; i < drop.quantity; i++) {
                    dropObjects.push(this.createDrop(x, y, { type: 'item', item: drop.item }));
                }
            }
        }

        return dropObjects;
    }
}