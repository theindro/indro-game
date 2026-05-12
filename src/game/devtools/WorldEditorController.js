// devtools/WorldEditorController.js

import {
    AnimatedSprite,
    Graphics,
    Sprite,
    Container
} from "pixi.js";

import { OutlineFilter } from "pixi-filters";

import { assetManager } from "../utils/assetManager";

import {
    spawnMob
} from "../controllers/createMobController.js";

import {
    createMobEntity
} from "../entities/createMobEntity.js";

import {
    ARCHETYPE_STATS,
    applyArchetypeVisuals
} from "../controllers/mobArchetypes/index.js";

import {
    INTERACTABLE_PROP_TYPES
} from "../world/interactablePropConfig.js";

export class WorldEditorController {

    constructor(worldManager, app) {

        this.world = worldManager;
        this.app = app;

        this.enabled = false;

        this.gridSize = 64;

        this.selectedType = null;
        this.selectedId = null;
        this.selectedSettings = {};
        this.selectedExtra = {};

        this.ghost = null;
        this.hovered = null;

        this.outlineFilter = new OutlineFilter({
            thickness: 2,
            color: 0xffff00,
            alpha: 1
        });

        this.initInput();
    }

    // =========================================================
    // INPUT
    // =========================================================

    initInput() {

        this.app.renderer.events.cursorStyles.default = "default";

        this.app.stage.eventMode = "static";
        this.app.stage.hitArea = this.app.screen;

        this.app.stage.on("pointermove", (e) => {
            this.onMove(e);
            this.onHover(e);
        });

        this.app.stage.on("pointerdown", (e) => {
            this.onPointerDown(e);
        });
    }

    // =========================================================
    // EDITOR STATE
    // =========================================================

    setEnabled(v) {

        this.enabled = v;

        if (!v) {
            this.cancelPlacement();
        }
    }

    cancelPlacement() {

        if (this.hovered?.filters) {
            this.hovered.filters = null;
        }

        this.hovered = null;

        if (this.ghost) {
            this.ghost.destroy({ children: true });
            this.ghost = null;
        }

        this.selectedType = null;
        this.selectedId = null;

        //this.enabled = false;
    }

    // =========================================================
    // START PLACEMENT
    // =========================================================

    startPlacement(data) {

        this.selectedType = data.type || "prop";
        this.selectedId = data.assetId;
        this.selectedSettings = data.settings || {};
        this.selectedExtra = data.extra || {};

        const preview = this.createPreview();

        if (!preview) {
            console.warn("Failed preview:", data);
            return;
        }

        preview.alpha = 0.5;

        if (preview.anchor?.set) {
            preview.anchor.set(0.5);
        }

        if (this.ghost) {
            this.world.editorLayer.removeChild(this.ghost);
            this.ghost.destroy({ children: true });
        }

        this.ghost = preview;

        this.world.editorLayer.addChild(this.ghost);

        this.enabled = true;
    }

    // =========================================================
    // PREVIEWS
    // =========================================================

    createPreview() {

        switch (this.selectedType) {

            case "mob":
                return this.createMobPreview();

            case "interactable":
                return this.createInteractablePreview();

            case "prop":
            default:
                return this.createPropPreview();
        }
    }

    createPropPreview() {

        const sprite = assetManager.createRenderable(
            this.selectedId,
            false
        );

        if (sprite instanceof AnimatedSprite) {
            sprite.play();
            sprite.animationSpeed *= 0.5;
        }

        this.applySettingsToSprite(
            sprite,
            this.selectedSettings
        );

        return sprite;
    }

    createMobPreview() {

        const stats = ARCHETYPE_STATS[this.selectedId];

        if (!stats) return null;

        const { c } = createMobEntity(
            this.app.renderer,
            "forest",
            stats.size,
            "",
            stats.type
        );

        const fakeMob = { c };

        applyArchetypeVisuals(
            fakeMob,
            this.selectedId,
            "forest"
        );

        c.alpha = 0.5;

        return c;
    }

    createInteractablePreview() {

        const def = INTERACTABLE_PROP_TYPES[this.selectedId];

        if (!def) return null;

        const texture = assetManager.getTexture(def.texture);

        let sprite;

        if (texture) {

            sprite = new Sprite(texture);

            sprite.anchor.set(0.5, 1);

            const targetSize = def.radius * 2;

            const maxDim = Math.max(
                texture.width,
                texture.height
            );

            const scale = targetSize / maxDim;

            sprite.scale.set(scale);

        } else {

            sprite = new Graphics()
                .circle(0, 0, def.radius)
                .fill(def.fallbackColor || 0xffffff);
        }

        return sprite;
    }

    // =========================================================
    // POINTER
    // =========================================================

    onMove(e) {

        if (!this.enabled || !this.ghost) return;

        const pos = this.getWorldPos(e);

        this.ghost.position.set(pos.x, pos.y);
    }

    onHover(e) {

        if (!this.enabled) return;

        const pos = this.getWorldPos(e);

        const found = this.findObjectUnderCursor(pos);

        if (this.hovered && this.hovered !== found?.sprite) {
            this.hovered.filters = null;
        }

        this.hovered = found?.sprite || null;

        if (this.hovered) {
            this.hovered.filters = [this.outlineFilter];
        }
    }

    onPointerDown(e) {

        if (!this.enabled) return;

        // RIGHT CLICK
        if (e.button === 2) {

            e.preventDefault?.();

            this.cancelPlacement();

            return;
        }

        // LEFT CLICK
        if (e.button === 0) {

            // PICK FIRST
            if (this.tryPick(e)) {
                return;
            }

            // PLACE
            const pos = this.getWorldPos(e);

            this.placeObject(pos.x, pos.y);
        }
    }

    // =========================================================
    // PICKING
    // =========================================================

    tryPick(e) {

        const pos = this.getWorldPos(e);

        const hit = this.findObjectUnderCursor(pos);

        if (!hit) return false;

        switch (hit.type) {

            case "mob":
                this.pickMob(hit.ref);
                return true;

            case "interactable":
                this.pickInteractable(hit.ref);
                return true;

            case "prop":
                this.pickProp(hit.ref);
                return true;
        }

        return false;
    }

    findObjectUnderCursor(pos) {

        // MOBS
        for (const mob of [...this.world.entitiesList.mobs].reverse()) {

            const dist = Math.hypot(
                mob.x - pos.x,
                mob.y - pos.y
            );

            if (dist < 40) {

                return {
                    type: "mob",
                    ref: mob,
                    sprite: mob.c
                };
            }
        }

        // INTERACTABLES
        for (const prop of [...this.world.interactablePropManager.allProps].reverse()) {

            const dist = Math.hypot(
                prop.x - pos.x,
                prop.z - pos.y
            );

            if (dist < prop.def.radius + 10) {

                return {
                    type: "interactable",
                    ref: prop,
                    sprite: prop.visual
                };
            }
        }

        // DECORATIVE PROPS
        for (const c of [...this.world.colliders].reverse()) {

            if (c.type !== "prop") continue;

            if (!c.sprite) continue;

            const dist = Math.hypot(
                c.sprite.x - pos.x,
                c.sprite.y - pos.y
            );

            if (dist < 40) {

                return {
                    type: "prop",
                    ref: c,
                    sprite: c.sprite
                };
            }
        }

        return null;
    }

    // =========================================================
    // PICK TYPES
    // =========================================================

    pickMob(mob) {

        if (mob.c?.parent) {
            mob.c.parent.removeChild(mob.c);
        }

        mob.c?.destroy({ children: true });

        this.world.entitiesList.mobs =
            this.world.entitiesList.mobs.filter(m => m !== mob);

        this.startPlacement({
            type: "mob",
            assetId: mob.archetype
        });
    }

    pickInteractable(prop) {

        this.world.interactablePropManager.removeProp(prop);

        this.startPlacement({
            type: "interactable",
            assetId: prop.def.id
        });
    }

    pickProp(hit) {

        this.world.entityLayer.removeChild(hit.sprite);

        this.world.colliders =
            this.world.colliders.filter(c => c !== hit);

        this.startPlacement({
            type: "prop",
            assetId: hit.id,
            settings: this.extractSettings(hit.sprite)
        });

        if (this.ghost) {
            this.ghost.position.set(hit.x, hit.y);
        }
    }

    // =========================================================
    // PLACEMENT
    // =========================================================

    placeObject(x, y) {

        switch (this.selectedType) {

            case "mob":
                return this.placeMob(x, y);

            case "interactable":
                return this.placeInteractable(x, y);

            case "prop":
            default:
                return this.placeProp(x, y);
        }
    }

    placeMob(x, y) {

        const mob = spawnMob(
            this.app.renderer,
            this.world.entityLayer,
            x,
            y,
            "forest",
            this.selectedId,
            1
        );

        mob.editorData = {
            type: "mob"
        };

        this.world.entitiesList.mobs.push(mob);

        console.log("Placed mob:", mob);
    }

    placeInteractable(x, y) {

        const prop =
            this.world.interactablePropManager
                .spawnManualProp(
                    this.selectedId,
                    x,
                    y,
                    1
                );

        if (prop) {

            prop.editorData = {
                type: "interactable"
            };
        }

        console.log("Placed interactable:", prop);
    }

    placeProp(x, y) {

        const sprite = assetManager.createRenderable(
            this.selectedId,
            false
        );

        if (!sprite) return;

        this.applySettingsToSprite(
            sprite,
            this.selectedSettings
        );

        sprite.anchor?.set?.(0.5);

        sprite.x = x;
        sprite.y = y;

        sprite.editorData = {
            type: "prop"
        };

        this.world.entityLayer.addChild(sprite);

        this.world.colliders.push({
            type: "prop",
            id: this.selectedId,
            x,
            y,
            sprite
        });

        console.log("Placed prop:", this.selectedId);
    }

    // =========================================================
    // UTILS
    // =========================================================

    applySettingsToSprite(sprite, settings) {

        if (!settings) return;

        if (settings.scale !== undefined) {
            sprite.scale.set(settings.scale);
        }

        if (settings.alpha !== undefined) {
            sprite.alpha = settings.alpha;
        }

        if (settings.rotation !== undefined) {
            sprite.rotation = settings.rotation;
        }

        if (settings.zIndex !== undefined) {
            sprite.zIndex = settings.zIndex;
        }
    }

    extractSettings(sprite) {

        return {
            scale: sprite.scale?.x,
            alpha: sprite.alpha,
            rotation: sprite.rotation,
            zIndex: sprite.zIndex
        };
    }

    snap(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    getWorldPos(event) {

        const pos = event.data.global;

        const world = this.world.world.toLocal(
            pos,
            this.app.stage
        );

        return {
            x: this.snap(world.x),
            y: this.snap(world.y)
        };
    }

    // Save world
    saveWorldAsJson() {

        const chunks = new Map();

        // 1. SAVE PROPS
        for (const c of this.world.colliders) {
            if (c.type !== "prop") continue;

            const chunkX = Math.floor(c.x / (this.world.chunkSize * this.world.tileSize));
            const chunkZ = Math.floor(c.y / (this.world.chunkSize * this.world.tileSize));
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key)) {
                chunks.set(key, {
                    chunkX,
                    chunkZ,
                    biome: this.world.getBiomeAtChunk(chunkX, chunkZ),
                    props: [],
                    mobs: [],
                    interactables: []
                });
            }

            chunks.get(key).props.push({
                id: c.id,
                x: c.x,
                y: c.y,
                scale: c.sprite?.scale?.x || 1
            });
        }

        // 2. SAVE MOBS
        for (const m of this.world.entitiesList.mobs) {
            const chunkX = Math.floor(m.x / (this.world.chunkSize * this.world.tileSize));
            const chunkZ = Math.floor(m.y / (this.world.chunkSize * this.world.tileSize));
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key)) {
                chunks.set(key, {
                    chunkX,
                    chunkZ,
                    biome: this.world.getBiomeAtChunk(chunkX, chunkZ),
                    props: [],
                    mobs: [],
                    interactables: []
                });
            }

            chunks.get(key).mobs.push({
                archetype: m.archetype,
                x: m.x,
                y: m.y
            });
        }

        // 3. SAVE INTERACTABLES
        for (const p of this.world.interactablePropManager.allProps) {
            const chunkX = Math.floor(p.x / (this.world.chunkSize * this.world.tileSize));
            const chunkZ = Math.floor(p.z / (this.world.chunkSize * this.world.tileSize));
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key)) {
                chunks.set(key, {
                    chunkX,
                    chunkZ,
                    biome: this.world.getBiomeAtChunk(chunkX, chunkZ),
                    props: [],
                    mobs: [],
                    interactables: []
                });
            }

            chunks.get(key).interactables.push({
                id: p.def.id,
                x: p.x,
                y: p.z
            });
        }

        // FINAL JSON
        const world = {
            version: 1,
            chunkSize: this.world.chunkSize,
            tileSize: this.world.tileSize,
            chunks: Array.from(chunks.values())
        };

        console.log("WORLD SAVED", world);

        const blob = new Blob([JSON.stringify(world, null, 2)], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "world.json";
        a.click();

        URL.revokeObjectURL(url);
    }

    loadWorld(data) {
        this.world.loadWorldFromJson(data);
    }
}