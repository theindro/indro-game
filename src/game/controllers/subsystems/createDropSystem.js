// controllers/subsystems/createDropSystem.js
import {Container, Sprite, Graphics} from 'pixi.js';
import {useGameStore} from "../../../stores/gameStore.js";
import {ItemDatabase, DropTables, getDropTableForMob} from '../../items.js';
import {assetManager} from '../../utils/assetManager.js';
import {VFX} from "../../GlobalEffects.js";
import {audioManager} from "../../utils/audioManager.js";

export function createDropSystem(ctx) {
    const {world, entityLayer, drops} = ctx;

    // ─────────────────────────────
    // Drop Rolling Logic
    // ─────────────────────────────
    function rollDrop(mobType = 'default', isBoss = false) {
        const drops = [];
        const table = getDropTableForMob(mobType);

        // Roll gold
        if (Math.random() * 100 < table.gold.chance) {
            const amount = table.gold.min + Math.floor(Math.random() * (table.gold.max - table.gold.min + 1));
            drops.push({type: 'gold', amount});
        }

        // Roll gold
        if (Math.random() * 100 < table.void_essence.chance) {
            const amount = table.void_essence.min + Math.floor(Math.random() * (table.void_essence.max - table.void_essence.min + 1));

            drops.push({type: 'void_essence', amount});
        }

        // Roll heart (healing)
        if (Math.random() < 0.1) { // 10% chance
            drops.push({type: 'hp', amount: 20});
        }

        // Roll items
        for (const itemDrop of table.items) {
            if (Math.random() * 100 < itemDrop.chance) {
                const quantity = itemDrop.minQty + Math.floor(Math.random() * (itemDrop.maxQty - itemDrop.minQty + 1));
                const item = {...ItemDatabase[itemDrop.id]};
                if (item) {
                    drops.push({type: 'item', item, quantity});
                }
            }
        }

        return drops;
    }

    // ─────────────────────────────
    // Visual Creation
    // ─────────────────────────────
    function createShadow() {
        const shadow = new Graphics();
        shadow.ellipse(5, 30, 13, 5).fill({color: 0, alpha: 0.28});
        return shadow;
    }

    function createDropVisual(x, y, drop) {
        const container = new Container();
        container.x = x;
        container.y = y;

        if (drop.type === 'gold') {
            // Gold drop visual
            const graphics = new Graphics();
            graphics.circle(0, 0, 5).fill({color: 0xffcc44});
            graphics.circle(0, 0, 3).fill({color: 0xffaa00});
            container.addChild(graphics);

        } else if (drop.type === 'void_essence') {
            // Item drop visual - use textureId directly
            const texture = assetManager.getTexture(drop.type);
            const sprite = new Sprite(texture);

            sprite.anchor.set(0.5);
            sprite.scale.set(0.2);

            container.addChild(sprite);
        } else if (drop.type === 'hp') {
            // Heart drop visual
            const graphics = new Graphics();
            graphics.circle(-3.5, -2, 5).fill({color: 0xff2255});
            graphics.circle(3.5, -2, 5).fill({color: 0xff2255});
            graphics.moveTo(-8, 1).lineTo(8, 1).lineTo(0, 10).closePath().fill({color: 0xff2255});
            container.addChild(graphics);

        } else if ((drop.type === 'item') && drop.item) {
            // Add shadow under the drop
            const shadow = createShadow();
            container.addChild(shadow);

            // Item drop visual - use textureId directly
            const texture = assetManager.getTexture(drop.item.textureId);

            if (texture) {
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.1);
                sprite.scale.set(0.1);
                container.addChild(sprite);
            } else {
                // Fallback
                const graphics = new Graphics();
                const rarityColor = drop.item.rarity?.color || '#ffaa44';
                graphics.rect(-8, -8, 16, 16).fill({color: rarityColor});
                graphics.rect(-6, -6, 12, 12).fill({color: rarityColor});
                container.addChild(graphics);
            }
        }

        entityLayer.addChild(container);
        return container;
    }

    // ─────────────────────────────
    // Drop Instance Creation
    // ─────────────────────────────
    function createDrop(x, y, drop) {
        const container = createDropVisual(x, y, drop);

        // Physics properties
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
            //bob += 0.08;
            //floatOffset += 0.05;
            //container.y += Math.sin(bob) * 0.28;

            // Rotation for items
            if (drop.type === 'item') {
                container.rotation = Math.sin(floatOffset) * 0.1;
            }
        };

        const destroy = () => {
            if (container.parent) {
                container.parent.removeChild(container);
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

    // ─────────────────────────────
    // Spawn Drops from Entity
    // ─────────────────────────────
    function spawnDrops(x, y, mobType = 'default', isBoss = false) {
        const dropList = rollDrop(mobType, isBoss);
        const dropObjects = [];


        for (const drop of dropList) {
            if (drop.type === 'gold') {
                // Spawn multiple gold coins
                for (let i = 0; i < drop.amount; i++) {
                    dropObjects.push(createDrop(x, y, {type: 'gold', amount: 1}));
                }
            } else if (drop.type === 'hp') {
                dropObjects.push(createDrop(x, y, {type: 'hp', amount: drop.amount}));

            } else if (drop.type === 'void_essence') {
                // Spawn multiple void essence
                for (let i = 0; i < drop.amount; i++) {
                    dropObjects.push(createDrop(x, y, {type: drop.type, amount: 1}));
                }
            } else if (drop.type === 'item') {
                for (let i = 0; i < drop.quantity; i++) {
                    dropObjects.push(createDrop(x, y, {type: 'item', item: drop.item}));
                }
            }
        }

        // Add to global drops array
        if (drops && dropObjects.length) {
            drops.push(...dropObjects);
        }

        return dropObjects;
    }

    // ─────────────────────────────
    // Update All Drops (Magnetism + Collection)
    // ─────────────────────────────
    function updateDrops(px, py) {
        if (!drops) return;

        // Batch accumulators
        let goldBatch = 0;
        let voidBatch = 0;
        let hpBatch = 0;
        const itemBatch = [];

        for (let di = drops.length - 1; di >= 0; di--) {
            const d = drops[di];

            if (!d || !d.container || d.container.destroyed) {
                drops.splice(di, 1);
                continue;
            }

            const dx = px - d.container.x;
            const dy = py - d.container.y;
            const dist = Math.hypot(dx, dy);

            d.container.zIndex = d.container.y;

            if (dist > 1000) {
                if (d.container.parent) d.container.parent.removeChild(d.container);
                d.container.destroy();
                drops.splice(di, 1);
                continue;
            }

            if (d.update) d.update();

            if (dist < 120) {
                d.container.x += dx * 0.07;
                d.container.y += dy * 0.07;
            }

            if (dist < 22) {
                audioManager.playSFX('/sounds/pickup.mp3', 0.15);

                // Accumulate instead of calling store immediately
                if (d.type === 'gold')         goldBatch += d.amount || 1;
                else if (d.type === 'void_essence') voidBatch += d.amount || 1;
                else if (d.type === 'hp')       hpBatch += d.amount || 20;
                else // Change itemBatch to store just the id string
                if (d.type === 'item' && d.item) {
                    const itemId = d.item.id; // ← cache before any cleanup
                    itemBatch.push(itemId);
                }

                // VFX still per-drop (pixi only, no react)
                if (d.type === 'hp')
                    VFX.burst(d.container.x, d.container.y, 0xff2255, 6, 2);

                VFX.addFloat(
                    d.type === 'gold' ? `+${d.amount}` :
                        d.type === 'hp'   ? `+${d.amount} HP` :
                            d.type === 'void_essence' ? `+${d.amount}` :
                                d.item?.name,
                    d.container.x, d.container.y,
                    d.type === 'gold' ? '#ffd700' :
                        d.type === 'hp'   ? '#ff2255' :
                            d.type === 'void_essence' ? 'purple' :
                                d.item?.rarity?.color || '#ffaa44'
                );

                if (d.container.parent) d.container.parent.removeChild(d.container);
                if (!d.container.destroyed) d.container.destroy({ children: true });
                d.container = null;
                d.item = null;
                drops.splice(di, 1);
            }
        }

        // ── Single store update per frame ──────────────────
        if (goldBatch || voidBatch || hpBatch || itemBatch.length) {
            const store = useGameStore.getState();

            useGameStore.setState(state => {
                const inv = state.inventory;
                const newSlots = [...inv.slots];
                let addedItems = true;

                console.log(itemBatch);

                for (const itemId of itemBatch) {
                    if (!itemId) continue; // safety guard
                    const idx = newSlots.findIndex(
                        s => s && s.id === itemId && ItemDatabase[itemId]?.stackable
                    );
                    if (idx !== -1) {
                        newSlots[idx] = { ...newSlots[idx], quantity: newSlots[idx].quantity + 1 };
                    } else {
                        const empty = newSlots.findIndex(s => s === null);
                        if (empty !== -1) newSlots[empty] = { id: itemId, quantity: 1 };
                        else addedItems = false;
                    }
                }

                return {
                    player: hpBatch ? {
                        ...state.player,
                        hp: Math.min(state.player.maxHp, state.player.hp + hpBatch)
                    } : state.player,
                    inventory: {
                        ...inv,
                        gold: inv.gold + goldBatch,
                        void_essence: inv.void_essence + voidBatch,
                        slots: newSlots,
                    }
                };
            });

            // Recalc only if items were picked up
            if (itemBatch.length) store.recalculateStats();
        }
    }

    // ─────────────────────────────
    // Public API
    // ─────────────────────────────
    return {
        spawnDrops,        // Spawn drops from a mob/boss
        updateDrops,       // Update all drops (call every frame)
        rollDrop,          // Expose for testing/debugging
        createDrop         // Expose for manual drop creation
    };
}