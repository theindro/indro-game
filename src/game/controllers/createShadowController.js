// utils/ShadowManager.js
import {BlurFilter, Container} from 'pixi.js';

export class ShadowManager {
    constructor() {
        this.currentDirection = { x: -25, y: 0, skew: -0.3, alpha: 0.15 };
        this.targetDirection = { ...this.currentDirection };
        this.transitionProgress = 1;
        this.transitionDuration = 0;
        this.transitionTimer = 0;
        this.isTransitioning = false;
        this.activeShadows = new Map();
        this.listeners = []; // ✅ FIX: Added missing listeners array
        this.nextId = 0; // ✅ FIX: Use numeric IDs instead of Symbol for easier debugging
    }

    setDirection(direction, transitionTime = 0) {
        if (transitionTime > 0) {
            // Start smooth transition
            this.targetDirection = { ...direction };
            this.transitionDuration = transitionTime;
            this.transitionTimer = 0;
            this.isTransitioning = true;
            this.transitionProgress = 0;
        } else {
            // Instant change
            this.currentDirection = { ...direction };
            this.targetDirection = { ...direction };
            this.updateAllShadows();
        }
    }

    update(deltaTime) {
        if (!this.isTransitioning) return;

        this.transitionTimer += deltaTime;
        this.transitionProgress = Math.min(1, this.transitionTimer / this.transitionDuration);

        // Interpolate current direction
        const newDirection = {
            x: this.lerp(this.currentDirection.x, this.targetDirection.x, this.transitionProgress),
            y: this.lerp(this.currentDirection.y, this.targetDirection.y, this.transitionProgress),
            skew: this.lerp(this.currentDirection.skew, this.targetDirection.skew, this.transitionProgress),
            alpha: this.lerp(this.currentDirection.alpha, this.targetDirection.alpha, this.transitionProgress)
        };

        // Update current direction
        this.currentDirection = newDirection;

        // Update all shadows with new interpolated values
        this.updateAllShadows();

        if (this.transitionProgress >= 1) {
            this.isTransitioning = false;
        }
    }

    lerp(start, end, progress) {
        return start + (end - start) * this.easeInOutCubic(progress);
    }

    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    // Set based on weather type
    setWeather(weatherType, transitionTime = 2.0) {
        const weatherConfig = {
            sunny: { x: -25, y: 0, skew: -0.3, alpha: 0.15 },
            rainy: { x: -15, y: -5, skew: -0.2, alpha: 0.1 },
            cloudy: { x: -10, y: -10, skew: -0.15, alpha: 0.12 },
            night: { x: -30, y: 5, skew: -0.35, alpha: 0.08 },
            sandstorm: { x: -35, y: 10, skew: -0.4, alpha: 0.2 },
            snow: { x: -20, y: -8, skew: -0.25, alpha: 0.1 },
            embers: { x: -10, y: 5, skew: -0.15, alpha: 0.25 }, // ✅ Added embers config
            fog: { x: -5, y: -2, skew: -0.1, alpha: 0.08 } // ✅ Added fog config
        };

        const config = weatherConfig[weatherType] || weatherConfig.sunny;
        this.setDirection(config, transitionTime);
    }

    // Register a shadow for dynamic updates
    registerShadow(shadow, propVisual, scale, heightFactor) {

        // One BlurFilter per shadow — cheaper than recreating each frame
        // const blurFilter = new BlurFilter({ strength: 1 });
        // shadow.filters = [blurFilter];

        const shadowData = {
            shadow,
            propVisual,
            scale,
            heightFactor,
            originalTexture: propVisual.texture
        };

        const id = this.nextId++; // ✅ FIX: Use numeric ID instead of Symbol
        this.activeShadows.set(id, shadowData);


        // Apply current direction immediately
        this.updateShadowPosition(shadowData);

        return id;
    }

    // Unregister shadow when prop is destroyed
    unregisterShadow(id) {
        this.activeShadows.delete(id);
    }

    // Update a single shadow position
    updateShadowPosition(shadowData) {
        const { shadow, propVisual, scale, heightFactor } = shadowData;
        if (!shadow || shadow.destroyed) return;
        if (!propVisual || propVisual.destroyed) return;

        shadow.x = propVisual.x + (this.currentDirection.x * scale) * (1 + heightFactor);
        shadow.y = propVisual.y + this.currentDirection.y;
        shadow.skew.x = this.currentDirection.skew - (heightFactor * 0.4);
        shadow.alpha = this.currentDirection.alpha;

        // Keep other properties
        shadow.scale.set(scale * 1.0, -scale * (0.4 + heightFactor * 0.2));
    }

    // Update all registered shadows
    updateAllShadows() {
        for (const [id, shadowData] of this.activeShadows.entries()) {
            this.updateShadowPosition(shadowData);
        }
    }

    // Update shadows for a specific chunk (for performance)
    updateChunkShadows(chunkKey) {
        for (const [id, shadowData] of this.activeShadows.entries()) {
            if (shadowData.chunkKey === chunkKey) {
                this.updateShadowPosition(shadowData);
            }
        }
    }

    // Add listener for direction changes
    addListener(callback) {
        if (!this.listeners) this.listeners = []; // ✅ Safety check
        this.listeners.push(callback);
    }

    notifyListeners(direction) {
        if (!this.listeners) return;
        this.listeners.forEach(callback => callback(direction));
    }

    // Clean up all shadows
    clear() {
        // Destroy all shadows before clearing
        for (const [id, shadowData] of this.activeShadows.entries()) {
            if (shadowData.shadow && !shadowData.shadow.destroyed) {
                shadowData.shadow.destroy();
            }
        }
        this.activeShadows.clear();
        this.listeners = [];
        this.nextId = 0;
    }
}

// Export singleton instance
export const shadowManager = new ShadowManager();