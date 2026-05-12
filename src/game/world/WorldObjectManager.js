// Single ownership point for world entity display nodes (entityLayer) and
// gameplay colliders for props / interactables. Other systems request work here.
import { spawnMob as spawnMobEntity } from '../controllers/createMobController.js';

export class WorldObjectManager {
    constructor(colliders, entityLayer, renderer) {
        this.colliders = colliders;
        this.entityLayer = entityLayer;
        this.renderer = renderer;
        this._nextMobId = 1;
    }

    addToEntityLayer(displayObject) {
        this.entityLayer.addChild(displayObject);
    }

    removeFromParent(displayObject) {
        displayObject?.parent?.removeChild(displayObject);
    }

    removeAndDestroyDisplayObject(displayObject, options = { children: true }) {
        if (!displayObject) return;
        this.removeFromParent(displayObject);
        displayObject.destroy?.(options);
    }

    addWorldCollider(collider) {
        this.colliders.push(collider);
    }

    removeCollider(collider) {
        const i = this.colliders.indexOf(collider);
        if (i !== -1) this.colliders.splice(i, 1);
    }

    removeCollidersIf(predicate) {
        for (let i = this.colliders.length - 1; i >= 0; i--) {
            if (predicate(this.colliders[i])) {
                this.colliders.splice(i, 1);
            }
        }
    }

    clearColliders() {
        this.colliders.length = 0;
    }

    spawnMob(x, y, biome = 'forest', archetype = null, difficulty = 1) {
        const mob = spawnMobEntity(
            this.renderer,
            this.entityLayer,
            x,
            y,
            biome,
            archetype,
            difficulty
        );
        mob.worldEntityId = this._nextMobId++;
        return mob;
    }

    destroyMob(mob) {
        if (!mob) return;
        if (mob.c?.parent) {
            mob.c.parent.removeChild(mob.c);
        }
        mob.c?.destroy?.({ children: true });
        mob.controller = null;
    }
}
