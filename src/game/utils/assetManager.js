// utils/assetManager.js
import * as PIXI from 'pixi.js';

class AssetManager {
    constructor() {
        this.textures = new Map();
        this.propTextures = new Map(); // Store props by type
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

        // Ground textures
        const propFiles = [
            // Stone variants (10 different stones)
            { file: '/gameprops/moss-stone-1.png', id: 'stone1', type: 'stone' },
            { file: '/gameprops/moss-stone-2.png', id: 'stone2', type: 'stone' },
            { file: '/gameprops/moss-stone-3.png', id: 'stone3', type: 'stone' },
            { file: '/gameprops/moss-stone-4.png', id: 'stone4', type: 'stone' },
            { file: '/gameprops/moss-stone-5.png', id: 'stone5', type: 'stone' },
            { file: '/gameprops/moss-stone-6.png', id: 'stone6', type: 'stone' },
            { file: '/gameprops/moss-stone-7.png', id: 'stone7', type: 'stone' },
            { file: '/gameprops/moss-stone-8.png', id: 'stone8', type: 'stone' },
            { file: '/gameprops/bush-1.png', id: 'bush1', type: 'bush' },
            { file: '/gameprops/bush-2.png', id: 'bush2', type: 'bush' },
            { file: '/gameprops/bush-3.png', id: 'bush3', type: 'bush' },
            { file: '/gameprops/tree1.png', id: 'tree1', type: 'tree' },
            { file: '/gameprops/tree2.png', id: 'tree2', type: 'tree' },
            { file: '/gameprops/tree3.png', id: 'tree3', type: 'tree' },
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

        for (const prop of propFiles) {
            const path = prop.file;
            loadPromises.push(this.loadTexture(prop.id, path, prop.type));
        }

        await Promise.all(loadPromises);

        // Organize textures by type
        for (const prop of propFiles) {
            if (!this.propTextures.has(prop.type)) {
                this.propTextures.set(prop.type, []);
            }

            const texture = this.textures.get(prop.id);

            if (texture) {
                this.propTextures.get(prop.type).push(texture);
            }
        }

        await Promise.all(loadPromises);
        this.loaded = true;
        console.log('Prop textures by type:', Array.from(this.propTextures.keys()));
    }

    getRandomPropTexture(type) {
        const textures = this.propTextures.get(type);
        if (!textures || textures.length === 0) {
            console.warn(`No textures found for type: ${type}`);
            return null;
        }
        return textures[Math.floor(Math.random() * textures.length)];
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