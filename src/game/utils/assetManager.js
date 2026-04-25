// utils/assetManager.js
import * as PIXI from 'pixi.js';

class AssetManager {
    constructor() {
        this.textures = new Map();
        this.loaded = false;
    }

// utils/assetManager.js
    async loadAssets() {
        // Load textures with the exact IDs that match your items' textureId
        const armourFiles = [
            { file: '1.png', id: 'leather_boots' },
            { file: '2.png', id: 'iron_boots' },
            { file: '3.png', id: 'swift_boots' },
        ];

        // Ground textures
        const groundFiles = [
            { file: 'lava-ground.png', id: 'lava-ground' },
            { file: 'snow-ground.png', id: 'snow-ground' },
            { file: 'grass-ground.png', id: 'grass-ground' },
            { file: 'desert-ground.png', id: 'desert-ground' },
            { file: '/lava/aaaaa.png', id: 'lava-texture' },
        ];

        const loadPromises = [];

        // Load armour textures
        for (const item of armourFiles) {
            const path = `/rpg/armour/${item.file}`;
            loadPromises.push(this.loadTexture(item.id, path));
        }

        // Load ground textures
        for (const item of groundFiles) {
            const path = `/${item.file}`;
            loadPromises.push(this.loadTexture(item.id, path));
        }

        await Promise.all(loadPromises);
        this.loaded = true;
        console.log('Loaded textures:', Array.from(this.textures.keys()));
    }

    async loadTexture(name, path) {
        try {
            console.log(`Loading texture "${name}" from ${path}`);
            const texture = await PIXI.Assets.load(path);
            this.textures.set(name, texture);
            console.log(`✓ Loaded: ${name}`);
            return texture;
        } catch (error) {
            console.warn(`Failed to load ${name}:`, error.message);
            return null;
        }
    }

    getTexture(name) {
        const texture = this.textures.get(name);
        if (!texture) {
            console.warn(`Texture not found: ${name}. Available:`, Array.from(this.textures.keys()));
        }
        return texture;
    }

    isLoaded() {
        return this.loaded;
    }
}

export const assetManager = new AssetManager();