import {AnimatedSprite} from "pixi.js";
import {assetManager} from "../utils/assetManager";
import { OutlineFilter } from "pixi-filters";

export class WorldEditorController {
    constructor(worldManager, app) {
        this.world = worldManager;
        this.app = app;

        this.enabled = false;

        this.isAnimated = false;
        this.selectedTexture = null;
        this.ghost = null;

        this.gridSize = 64;

        this.hovered = null;
        this.outlineFilter = new OutlineFilter({
            thickness: 2,
            color: 0xffff00,
            alpha: 1
        });

        this.initInput();
    }

    initInput() {
        this.app.renderer.events.cursorStyles.default = "default";

        this.app.stage.eventMode = "static";
        this.app.stage.hitArea = this.app.screen;

        this.app.stage.on("pointermove", (e) => this.onMove(e));
        this.app.stage.on("pointerdown", (e) => this.onPointerDown(e));
        this.app.stage.on("pointermove", (e) => this.onHover(e));
    }

    onHover(e) {
        if (!this.enabled) return;

        const pos = this.getWorldPos(e);

        let found = null;

        for (const c of this.world.colliders) {
            if (!c.sprite) continue;

            const dx = c.sprite.x - pos.x;
            const dy = c.sprite.y - pos.y;

            if (Math.sqrt(dx * dx + dy * dy) < 40) {
                found = c.sprite;
                break;
            }
        }

        // remove previous hover
        if (this.hovered && this.hovered !== found) {
            this.hovered.filters = null;
        }

        this.hovered = found;

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
            // 1st: try pick
            if (this.tryPick(e)) return;

            // 2nd: place if nothing picked
            const pos = this.getWorldPos(e);
            this.placeProp(pos.x, pos.y);
        }
    }

    tryPick(e) {
        const pos = this.getWorldPos(e);

        const hit = this.world.colliders
            .filter(c => c.type === "prop" && c.sprite)
            .reverse()
            .find(c => {
                const dx = c.sprite.x - pos.x;
                const dy = c.sprite.y - pos.y;
                return dx * dx + dy * dy < 1600; // 40px radius
            });

        if (!hit) return false;

        this.pickProp(hit);
        return true;
    }

    setEnabled(v) {
        this.enabled = v;

        if (!v && this.ghost) {
            this.ghost.destroy();
            this.ghost = null;
        }
    }

    startPlacement(data) {
        console.log("PLACE ASSET", data);

        this.selectedId = data.assetId;
        this.isAnimated = data.animated;
        this.selectedSettings = data.settings;

        // ❌ don't manually fetch texture anymore
        // this.selectedTexture = assetManager.getTexture(data.assetId);

        // ✅ USE SAME RENDER FACTORY AS FINAL OBJECT
        const preview = assetManager.createRenderable(this.selectedId, this.isAnimated);

        if (!preview) {
            console.warn("Missing renderable for:", data.assetId);
            return;
        }

        // IMPORTANT: ghost must not run logic like particles, timers, etc
        if (preview instanceof AnimatedSprite) {
            preview.play();
            preview.animationSpeed *= 0.5; // optional slow preview
        }

        this.applySettingsToSprite(preview, data.settings);

        preview.alpha = 0.5;
        preview.anchor?.set?.(0.5);

        if (!this.ghost) {
            this.ghost = preview;
            this.world.editorLayer.addChild(this.ghost);
        } else {
            this.world.editorLayer.removeChild(this.ghost);
            this.ghost.destroy();

            this.ghost = preview;
            this.world.editorLayer.addChild(this.ghost);
        }

        this.enabled = true;
    }

    pickProp(hit) {
        console.log("Picked prop:", hit.id);

        // remove from world
        this.world.entityLayer.removeChild(hit.sprite);

        // remove collider
        this.world.colliders = this.world.colliders.filter(c => c !== hit);

        // reuse placement system
        this.startPlacement({
            assetId: hit.id,
            animated: hit.sprite instanceof AnimatedSprite,
            settings: this.extractSettings(hit.sprite)
        });

        // optional: pre-position ghost at old location
        if (this.ghost) {
            this.ghost.position.set(hit.x, hit.y);
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

    cancelPlacement() {
        if (this.hovered) {
            this.hovered.filters = null;
            this.hovered = null;
        }

        if (this.ghost) {
            this.ghost.destroy();
            this.ghost = null;
        }

        this.selectedId = null;
        this.enabled = false;
    }


    snap(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    getWorldPos(event) {
        const pos = event.data.global;

        // convert screen → world
        const world = this.world.world.toLocal(pos, this.app.stage);

        return {
            x: this.snap(world.x),
            y: this.snap(world.y)
        };
    }

    onMove(e) {
        if (!this.enabled || !this.ghost) return;

        const pos = this.getWorldPos(e);

        this.ghost.position.set(pos.x, pos.y);
    }

    placeProp(x, y) {
        const sprite = assetManager.createRenderable(this.selectedId, this.isAnimated);

        if (!sprite) return;

        // ✅ APPLY SETTINGS HERE TOO
        this.applySettingsToSprite(sprite, this.selectedSettings);

        sprite.anchor?.set?.(0.5);

        sprite.x = x;
        sprite.y = y;

        console.log(sprite);

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
}