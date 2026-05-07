export class createLightEmitter {
    constructor(lightingController, radius = 100, color = 0xffaa66, intensity = 1) {
        this.lightingController = lightingController;
        this.radius = radius;
        this.color = color;
        this.intensity = intensity;
        this.id = null;
        this.entity = null;
    }

    attachToEntity(entity) {
        this.entity = entity;
        this.id = `light_${entity.id || Math.random()}`;

        this.lightingController.addLight(
            this.id,
            entity.x,
            entity.y,
            this.radius,
            this.color,
            this.intensity
        );
    }

    update() {
        if (!this.entity || !this.id) return;

        this.lightingController.updateLight(
            this.id,
            this.entity.x,
            this.entity.y,
            this.radius,
            this.intensity
        );
    }

    remove() {
        if (this.id) {
            this.lightingController.removeLight(this.id);
            this.id = null;
        }
    }
}