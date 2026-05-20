// devtools/WorldEditorController.js

import {
    AnimatedSprite,
    Graphics,
    Sprite,
    Container
} from "pixi.js";

import {OutlineFilter} from "pixi-filters";

import {assetManager} from "../utils/assetManager";

import {
    createMobEntity
} from "../entities/createMobEntity.js";

import {
    ARCHETYPE_STATS,
    applyArchetypeVisuals
} from "../controllers/mobArchetypes/index.js";

import { getInteractablePropTypes } from "../world/interactablePropConfig.js";

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
            this.ghost.destroy({children: true});
            this.ghost = null;
        }

        this.selectedType = null;
        this.selectedId = null;
    }

    // =========================================================
    // START PLACEMENT
    // =========================================================

    startPlacement(data) {

        this.selectedType     = data.type || "prop";
        this.selectedId       = data.assetId;
        this.selectedSettings = data.settings || {};
        this.selectedExtra    = data.extra || {};

        const preview = this.createPreview();

        if (!preview) {
            console.warn("Failed preview:", data);
            return;
        }

        preview.alpha = 0.5;

        if (preview.anchor?.set) {
            if (this.selectedType === 'prop' || this.selectedType === 'interactable') {
                preview.anchor.set(0.5, 1);
            } else {
                preview.anchor.set(0.5);
            }
        }

        if (this.ghost) {
            this.world.editorLayer.removeChild(this.ghost);
            this.ghost.destroy({children: true});
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

        const sprite = assetManager.createRenderable(this.selectedId, false);

        if (sprite instanceof AnimatedSprite) {
            sprite.play();
            sprite.animationSpeed *= 0.5;
        }

        this.applySettingsToSprite(sprite, this.selectedSettings);

        return sprite;
    }

    createMobPreview() {

        const stats = ARCHETYPE_STATS[this.selectedId];
        if (!stats) return null;

        const {c} = createMobEntity(
            this.app.renderer,
            "forest",
            stats.size,
            null,
            stats.type
        );

        const fakeMob = {c};
        applyArchetypeVisuals(fakeMob, this.selectedId, "forest");
        c.alpha = 0.5;

        return c;
    }

    /**
     * Interactable preview uses the same sizing logic as InteractablePropManager._createProp:
     *   spriteScale = (targetSize / maxDim) * userScale
     * so the ghost matches what gets placed exactly.
     */
    createInteractablePreview() {

        const def = getInteractablePropTypes()[this.selectedId];
        if (!def) return null;

        // User scale from settings (restored when picking, defaults to 1 for new placements)
        const userScale  = this.selectedSettings.scale ?? 1;
        const targetSize = def.radius * 2;

        const texture = assetManager.getTexture(def.texture);

        let sprite;

        if (texture) {
            sprite = new Sprite(texture);
            sprite.anchor.set(0.5, 1);

            const maxDim     = Math.max(texture.width, texture.height);
            const finalScale = (targetSize / maxDim) * userScale;
            sprite.scale.set(finalScale);
        } else {
            // Fallback circle sized to def.radius * userScale
            sprite = new Graphics()
                .circle(0, 0, def.radius * userScale)
                .fill(def.fallbackColor ?? 0xffffff);
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

        const pos   = this.getWorldPos(e);
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

        if (e.button === 2) {
            e.preventDefault?.();
            this.cancelPlacement();
            return;
        }

        if (e.button === 0) {
            if (!this.ghost) {
                if (this.tryPick(e)) return;
            }

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
            case "mob":         this.pickMob(hit.ref);         return true;
            case "interactable": this.pickInteractable(hit.ref); return true;
            case "prop":        this.pickProp(hit.ref);        return true;
        }

        return false;
    }

    findObjectUnderCursor(pos) {

        // MOBS
        for (const mob of [...this.world.entitiesList.mobs].reverse()) {
            if (Math.hypot(mob.x - pos.x, mob.y - pos.y) < 40) {
                return { type: "mob", ref: mob, sprite: mob.c };
            }
        }

        // INTERACTABLES
        for (const prop of [...this.world.interactablePropManager.allProps].reverse()) {
            const dist = Math.hypot(prop.x - pos.x, prop.z - pos.y);
            if (dist < prop.def.radius + 10) {
                return { type: "interactable", ref: prop, sprite: prop.visual };
            }
        }

        // DECORATIVE PROPS
        const propSprite = this.world.propManager.hitTestPropAt(pos.x, pos.y);
        if (propSprite) {
            return { type: "prop", ref: propSprite, sprite: propSprite };
        }

        return null;
    }

    // =========================================================
    // PICK TYPES
    // =========================================================

    pickMob(mob) {

        this.world.worldObjects.destroyMob(mob);

        const mi = this.world.entitiesList.mobs.indexOf(mob);
        if (mi !== -1) this.world.entitiesList.mobs.splice(mi, 1);

        this.startPlacement({ type: "mob", assetId: mob.archetype });
    }

    pickInteractable(prop) {

        // Extract the visual scale before removing — prop.scale is the spriteScale
        // stored by _createProp (already includes the base targetSize/maxDim factor).
        // We reverse it back to a pure userScale so the preview rebuilds at the right size.
        const def        = prop.def;
        const texture    = assetManager.getTexture(def.texture);
        let   userScale  = 1;

        if (texture) {
            const targetSize = def.radius * 2;
            const maxDim     = Math.max(texture.width, texture.height);
            const baseScale  = targetSize / maxDim;
            // prop.scale = baseScale * userScale  →  userScale = prop.scale / baseScale
            userScale = baseScale > 0 ? prop.scale / baseScale : 1;
        }

        const sx = prop.x;
        const sy = prop.z;

        this.world.interactablePropManager.removeProp(prop);

        this.startPlacement({
            type:     "interactable",
            assetId:  def.id,
            settings: { scale: userScale },
        });

        // Position ghost at where the prop was
        if (this.ghost) {
            this.ghost.position.set(sx, sy);
        }
    }

    pickProp(sprite) {

        const sx       = sprite.x;
        const sy       = sprite.y;
        const settings = {
            ...this.extractSettings(sprite),
            collidable: sprite.editorData?.collidable,
        };

        const id = sprite.worldPropRecord?.id ?? this.selectedId;

        this.world.propManager.removePropVisual(sprite);

        this.startPlacement({ type: "prop", assetId: id, settings });

        if (this.ghost) {
            this.ghost.position.set(sx, sy);
        }
    }

    // =========================================================
    // PLACEMENT
    // =========================================================

    placeObject(x, y) {

        switch (this.selectedType) {
            case "mob":         return this.placeMob(x, y);
            case "interactable": return this.placeInteractable(x, y);
            case "prop":
            default:            return this.placeProp(x, y);
        }
    }

    placeMob(x, y) {

        const mob = this.world.worldObjects.spawnMob(x, y, "forest", this.selectedId, 1);
        mob.editorData = { type: "mob" };
        this.world.entitiesList.mobs.push(mob);
        console.log("Placed mob:", mob);
    }

    placeInteractable(x, y) {

        // Pass userScale through — spawnManualProp forwards it to _createProp
        // which applies: finalScale = (targetSize / maxDim) * userScale
        const userScale = this.selectedSettings.scale ?? 1;

        const prop = this.world.interactablePropManager.spawnManualProp(
            this.selectedId,
            x,
            y,
            userScale
        );

        if (prop) {
            prop.editorData = { type: "interactable" };
        }

        console.log("Placed interactable:", prop);
    }

    placeProp(x, y) {

        const w        = this.world;
        const cw       = w.chunkSize * w.tileSize;
        const chunkX   = Math.floor(x / cw);
        const chunkZ   = Math.floor(y / cw);
        const chunkKey = `${chunkX},${chunkZ}`;
        const biome    = w.getBiomeAtChunk(chunkX, chunkZ);

        const spr = w.propManager.placeLoadedProp(
            {
                id:       this.selectedId,
                x,
                y,
                scale:    this.selectedSettings.scale ?? 1,
                rotation: this.selectedSettings.rotation ?? 0,
                collision: this.selectedSettings.collidable,
            },
            chunkKey,
            biome
        );

        if (!spr) return;

        spr.editorData = {
            type:      "prop",
            collidable: this.selectedSettings.collidable,
        };

        this.applySettingsToSprite(spr, this.selectedSettings);

        console.log("Placed prop:", this.selectedId);
    }

    // =========================================================
    // UTILS
    // =========================================================

    applySettingsToSprite(sprite, settings) {

        if (!settings) return;

        if (settings.scale    !== undefined) sprite.scale.set(settings.scale);
        if (settings.alpha    !== undefined) sprite.alpha    = settings.alpha;
        if (settings.rotation !== undefined) sprite.rotation = settings.rotation;
        if (settings.zIndex   !== undefined) sprite.zIndex   = settings.zIndex;
    }

    extractSettings(sprite) {

        return {
            scale:    sprite.scale?.x,
            alpha:    sprite.alpha,
            rotation: sprite.rotation,
            zIndex:   sprite.zIndex,
        };
    }

    snap(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    getWorldPos(event) {

        const pos   = event.data.global;
        const local = this.world.world.toLocal(pos, this.app.stage);

        return { x: local.x, y: local.y };
    }

    // =========================================================
    // SAVE / LOAD
    // =========================================================

    saveWorldAsJson() {

        const chunks     = new Map();
        const chunkWorld = this.world.chunkSize * this.world.tileSize;

        const ensureChunk = (chunkX, chunkZ) => {
            const key = `${chunkX},${chunkZ}`;
            if (!chunks.has(key)) {
                chunks.set(key, {
                    chunkX,
                    chunkZ,
                    biome:        this.world.getBiomeAtChunk(chunkX, chunkZ),
                    props:        [],
                    mobs:         [],
                    interactables: [],
                });
            }
            return chunks.get(key);
        };

        // 1. PROPS
        const propExport = this.world.propManager.serializePropsForWorldJson(
            this.world.chunkSize,
            this.world.tileSize
        );
        for (const [, block] of propExport) {
            ensureChunk(block.chunkX, block.chunkZ).props.push(...block.props);
        }

        // 2. MOBS
        for (const m of this.world.entitiesList.mobs) {
            const chunkX = Math.floor(m.x / chunkWorld);
            const chunkZ = Math.floor(m.y / chunkWorld);
            ensureChunk(chunkX, chunkZ).mobs.push({
                archetype: m.archetype,
                x: m.x,
                y: m.y,
            });
        }

        // 3. INTERACTABLES — save userScale so it round-trips correctly on load.
        //    prop.scale is the final spriteScale (baseScale * userScale); reverse it back.
        for (const p of this.world.interactablePropManager.allProps) {
            const chunkX  = Math.floor(p.x / chunkWorld);
            const chunkZ  = Math.floor(p.z / chunkWorld);
            const texture = assetManager.getTexture(p.def.texture);
            let   userScale = 1;

            if (texture) {
                const baseScale = (p.def.radius * 2) / Math.max(texture.width, texture.height);
                userScale = baseScale > 0 ? p.scale / baseScale : 1;
            }

            ensureChunk(chunkX, chunkZ).interactables.push({
                id:    p.def.id,
                x:     p.x,
                y:     p.z,
                scale: userScale,
            });
        }

        const world = {
            version:   1,
            chunkSize: this.world.chunkSize,
            tileSize:  this.world.tileSize,
            chunks:    Array.from(chunks.values()),
        };

        console.log("WORLD SAVED", world);

        const blob = new Blob([JSON.stringify(world, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = "world.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    loadWorld(data) {
        this.world.loadWorldFromJson(data);
    }
}