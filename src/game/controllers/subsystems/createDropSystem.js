// controllers/subsystems/createDropSystem.js
import {Container, Sprite, Graphics} from 'pixi.js';
import {useGameStore} from "../../../stores/gameStore.js";
import {
    ItemDatabase,
    getDropTableForMob,
    rollMobGearDropIds,
    rollBossGearDropIds,
} from '../../items.js';
import {assetManager} from '../../utils/assetManager.js';
import {VFX} from "../../GlobalEffects.js";
import {audioManager} from "../../utils/audioManager.js";
import {frameScale} from "../../constants.js";
import {createLootBeam, createLootBeamGlows, updateLootBeam} from "../../vfx/lootBeam.js";

const PICKUP_RADIUS = 60;
const MAGNET_RADIUS = 120;


/** Soft additive glows synced to the loot beam (ground pool + mid-pillar). */

function disposeDropGlows(drop) {
    if (!drop?.lootGlows?.length) return;
    for (const glow of drop.lootGlows) {
        if (glow) VFX.removeAttached(glow);
    }
    drop.lootGlows = [];
}

function disposeDropContainer(drop) {
    disposeDropGlows(drop);
    if (drop?.container && !drop.container.destroyed) {
        if (drop.container.parent) {
            drop.container.parent.removeChild(drop.container);
        }
        drop.container.destroy({ children: true });
    }
    drop.container = null;
}

export function createDropSystem(ctx) {
    const {world, entityLayer, drops} = ctx;

    // ─────────────────────────────
    // Drop Rolling Logic
    // ─────────────────────────────
    function rollDrop(mobType = 'default', isBoss = false) {
        const drops = [];
        const table = getDropTableForMob(isBoss || mobType === 'boss' ? 'boss' : mobType);

        if (Math.random() * 100 < table.gold.chance) {
            const amount = table.gold.min + Math.floor(Math.random() * (table.gold.max - table.gold.min + 1));
            drops.push({ type: 'gold', amount });
        }

        if (table.void_essence && Math.random() * 100 < table.void_essence.chance) {
            const amount = table.void_essence.min + Math.floor(
                Math.random() * (table.void_essence.max - table.void_essence.min + 1)
            );
            drops.push({ type: 'void_essence', amount });
        }

        if (Math.random() < 0.1) {
            drops.push({ type: 'hp', amount: 20 });
        }

        const gearIds = isBoss || mobType === 'boss'
            ? rollBossGearDropIds()
            : rollMobGearDropIds();

        for (const gearId of gearIds) {
            const item = ItemDatabase[gearId];
            if (item) {
                drops.push({ type: 'item', item: { ...item }, quantity: 1 });
            }
        }

        for (const itemDrop of table.items ?? []) {
            if (Math.random() * 100 < itemDrop.chance) {
                const quantity = itemDrop.minQty + Math.floor(
                    Math.random() * (itemDrop.maxQty - itemDrop.minQty + 1)
                );
                const item = { ...ItemDatabase[itemDrop.id] };
                if (item?.id) {
                    drops.push({ type: 'item', item, quantity });
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

        shadow.ellipse(0, 5, 13, 5).fill({color: 0, alpha: 0.28});

        return shadow;
    }

    function createDropVisual(x, y, drop) {
        const container = new Container();
        container.x = x;
        container.y = y;
        let lootBeam = null;
        let lootGlows = [];

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
            sprite.scale.set(0.05);

            container.addChild(sprite);
        } else if (drop.type === 'hp') {
            // Heart drop visual
            const graphics = new Graphics();
            graphics.circle(-3.5, -2, 5).fill({color: 0xff2255});
            graphics.circle(3.5, -2, 5).fill({color: 0xff2255});
            graphics.moveTo(-8, 1).lineTo(8, 1).lineTo(0, 10).closePath().fill({color: 0xff2255});
            container.addChild(graphics);

        } else if ((drop.type === 'item') && drop.item) {
            const rarityName = drop.item.rarity?.name;
            const beam = createLootBeam(rarityName);

            if (beam) {
                lootBeam = beam;
                container.addChild(beam.graphic);
                lootGlows = createLootBeamGlows(container, beam.cfg);
            }

            const shadow = createShadow();

            container.addChild(shadow);

            const texture = assetManager.getTexture(drop.item.textureId);

            if (texture) {
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5, 0.85);
                sprite.scale.set(0.12);
                container.addChild(sprite);
            } else {
                const graphics = new Graphics();
                const rarityColor = drop.item.rarity?.color || '#ffaa44';
                graphics.circle(0, 0, 10).fill({color: rarityColor});
                container.addChild(graphics);
            }
        }

        entityLayer.addChild(container);
        return { container, lootBeam, lootGlows };
    }

    // ─────────────────────────────
    // Drop Instance Creation
    // ─────────────────────────────
    function createDrop(x, y, drop) {
        const visual = createDropVisual(x, y, drop);
        const container = visual.container;
        const lootBeam = visual.lootBeam;
        const lootGlows = visual.lootGlows ?? [];

        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let bob = Math.random() * Math.PI * 2;
        let floatOffset = 0;
        let beamPhase = Math.random() * Math.PI * 2;

        const update = (dt = 1 / 60) => {
            const fs = frameScale(dt);
            vx *= Math.pow(0.95, fs);
            vy *= Math.pow(0.95, fs);
            container.x += vx * fs;
            container.y += vy * fs;

            if (lootBeam) {
                beamPhase += 0.06 * fs;
                updateLootBeam(lootBeam, beamPhase, fs);
            }
        };

        const destroy = () => {
            disposeDropContainer({ container, lootGlows });
        };

        const requiresReenter = !!drop.requiresReenter;

        return {
            container,
            type: drop.type,
            amount: drop.amount,
            item: drop.item,
            slotItem: drop.slotItem ?? null,
            lootGlows,
            requiresReenter,
            /** False until player leaves pickup radius once (prevents instant re-pickup after drop). */
            hasLeftPickupRadius: !requiresReenter,
            /** One pickup attempt per radius visit (avoids inventory-full spam). */
            pickupAttempted: false,
            vx,
            vy,
            bob,
            update,
            destroy,
        };
    }

    function spawnPlayerDrop(x, y, slotItem) {
        if (!slotItem?.id) return null;

        const dbItem = ItemDatabase[slotItem.id];
        if (!dbItem) return null;

        const dropObj = createDrop(x, y, {
            type: 'item',
            item: {...dbItem},
            requiresReenter: true,
            slotItem: {
                id: slotItem.id,
                quantity: slotItem.quantity ?? 1,
                enchantLevel: slotItem.enchantLevel ?? 0,
            },
        });

        drops.push(dropObj);
        return dropObj;
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
    function updateDrops(px, py, dt = 1 / 60) {
        if (!drops) return;

        const fs = frameScale(dt);
        const magnetPull = 1 - Math.pow(0.93, fs);

        // Batch accumulators
        let goldBatch = 0;
        let voidBatch = 0;
        let hpBatch = 0;
        const itemBatch = [];
        const maxHp = useGameStore.getState().player.maxHp;

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
                disposeDropContainer(d);
                drops.splice(di, 1);
                continue;
            }

            if (d.update) d.update(dt);

            if (dist >= PICKUP_RADIUS) {
                d.pickupAttempted = false;
                if (d.requiresReenter && !d.hasLeftPickupRadius) {
                    d.hasLeftPickupRadius = true;
                }
            }

            const canPickup = !d.requiresReenter || d.hasLeftPickupRadius;

            if (canPickup && dist < MAGNET_RADIUS) {
                //d.container.x += dx * magnetPull;
                //d.container.y += dy * magnetPull;
            }

            if (canPickup && dist < PICKUP_RADIUS) {
                if (d.type === 'item' && d.item) {
                    const slotItem = d.slotItem ?? {id: d.item.id, quantity: 1, enchantLevel: 0};
                    if (!useGameStore.getState().canFitItem(slotItem.id, slotItem.quantity ?? 1)) {
                        if (!d.pickupAttempted) {
                            d.pickupAttempted = true;
                            VFX.addFloat('Inventory Full', d.container.x, d.container.y - 24, '#ffffff');
                        }
                        continue;
                    }
                }

                if (d.pickupAttempted) continue;

                audioManager.playSFX('/sounds/pickup.mp3', 0.15);

                if (d.type === 'gold')         goldBatch += d.amount || 1;
                else if (d.type === 'void_essence') voidBatch += d.amount || 1;
                else if (d.type === 'hp') {
                    hpBatch += maxHp * 0.3;
                }
                else if (d.type === 'item' && d.item) {
                    const slotItem = d.slotItem ?? {id: d.item.id, quantity: 1, enchantLevel: 0};
                    itemBatch.push(slotItem);
                }

                // VFX still per-drop (pixi only, no react)

                disposeDropContainer(d);

                d.item = null;
                drops.splice(di, 1);
            }
        }

        // ── Single store update per frame ──────────────────
        if (goldBatch || voidBatch || hpBatch || itemBatch.length) {
            const store = useGameStore.getState();

            if (goldBatch || voidBatch || hpBatch) {
                useGameStore.setState((state) => ({
                    player: hpBatch ? {
                        ...state.player,
                        hp: Math.min(state.player.maxHp, state.player.hp + hpBatch),
                    } : state.player,
                    inventory: {
                        ...state.inventory,
                        gold: state.inventory.gold + goldBatch,
                        void_essence: state.inventory.void_essence + voidBatch,
                    },
                }));
            }

            let pickedAny = false;
            for (const slotItem of itemBatch) {
                if (!slotItem?.id) continue;
                if (store.addItem(slotItem.id, slotItem.quantity ?? 1, {
                    enchantLevel: slotItem.enchantLevel ?? 0,
                })) {
                    pickedAny = true;
                }
            }

            if (pickedAny) store.recalculateStats();
        }
    }

    // ─────────────────────────────
    // Chest / interactable loot (inventory overflow → ground)
    // ─────────────────────────────

    function overflowDropPosition(x, y, index) {
        const angle = index * 2.399963 + 0.7;
        const r = 18 + (index % 4) * 10;
        return { x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r };
    }

    function spawnOverflowLoot(x, y, itemId, quantity, indexOffset = 0) {
        if (!quantity || quantity < 1) return;

        if (itemId === 'gold') {
            for (let i = 0; i < quantity; i++) {
                const p = overflowDropPosition(x, y, indexOffset + i);
                drops.push(createDrop(p.x, p.y, {
                    type: 'gold',
                    amount: 1,
                    requiresReenter: true,
                }));
            }
            return;
        }

        if (itemId === 'void_essence') {
            for (let i = 0; i < quantity; i++) {
                const p = overflowDropPosition(x, y, indexOffset + i);
                drops.push(createDrop(p.x, p.y, {
                    type: 'void_essence',
                    amount: 1,
                    requiresReenter: true,
                }));
            }
            return;
        }

        const dbItem = ItemDatabase[itemId];
        if (!dbItem) return;

        for (let i = 0; i < quantity; i++) {
            const p = overflowDropPosition(x, y, indexOffset + i);
            drops.push(createDrop(p.x, p.y, {
                type: 'item',
                item: {...dbItem},
                requiresReenter: true,
                slotItem: {id: itemId, quantity: 1, enchantLevel: 0},
            }));
        }
    }

    /**
     * Grant rolled chest/harvest loot; items that do not fit spawn as world drops.
     * @param {number} x
     * @param {number} y
     * @param {{ id: string, amount: number }[]} entries
     */
    function grantLootEntries(x, y, entries) {
        if (!entries?.length) return;

        const store = useGameStore.getState();
        let statsChanged = false;
        let dropIndex = 0;

        for (const entry of entries) {
            const {id, amount} = entry;
            if (!id || !amount) continue;

            if (id === 'gold') {
                store.addGold(amount);
                continue;
            }
            if (id === 'void_essence') {
                store.addVoidEssence(amount);
                continue;
            }

            const dbItem = ItemDatabase[id];
            if (!dbItem) continue;

            let remaining = amount;
            while (remaining > 0) {
                const chunk = dbItem.stackable ? remaining : 1;
                if (store.canFitItem(id, chunk) && store.addItem(id, chunk)) {
                    remaining -= chunk;
                    statsChanged = true;
                } else if (store.canFitItem(id, 1) && store.addItem(id, 1)) {
                    remaining -= 1;
                    statsChanged = true;
                } else {
                    spawnOverflowLoot(x, y, id, remaining, dropIndex);
                    dropIndex += remaining;
                    remaining = 0;
                }
            }
        }

        if (statsChanged) store.recalculateStats();
    }

    /**
     * Spawn all loot as world pickups (chests) — nothing goes straight to inventory.
     * @param {number} x
     * @param {number} y
     * @param {{ id: string, amount: number }[]} entries
     */
    function spawnLootToGround(x, y, entries) {
        if (!entries?.length) return;

        let dropIndex = 0;
        for (const entry of entries) {
            const {id, amount} = entry;
            if (!id || !amount) continue;
            spawnOverflowLoot(x, y, id, amount, dropIndex);
            dropIndex += amount;
        }
    }

    // ─────────────────────────────
    // Public API
    // ─────────────────────────────
    return {
        spawnDrops,
        spawnPlayerDrop,
        grantLootEntries,
        spawnLootToGround,
        updateDrops,
        rollDrop,
        createDrop,
    };
}