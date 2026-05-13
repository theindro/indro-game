// utils/assetManager.js
import {Rectangle, Texture, Sprite, AnimatedSprite, Assets} from "pixi.js";

class AssetManager {
    constructor() {
        this.textures = new Map();
        this.propTextures = new Map(); // Store props by type
        this.animationFrames = new Map();
        this.vfxMeta = new Map(); // ✅ NEW
        this.assetMeta = new Map();
        this.loaded = false;
    }

    async loadAssets() {
        // ============= BOOTS (1-6) =============
        const bootsFiles = [
            { file: '1.png', id: 'boots_1', type: 'boots', itemId: 'leather_boots' },
            { file: '2.png', id: 'boots_2', type: 'boots', itemId: 'iron_boots' },
            { file: '3.png', id: 'boots_3', type: 'boots', itemId: 'steel_boots' },
            { file: '4.png', id: 'boots_4', type: 'boots', itemId: 'swift_boots' },
            { file: '5.png', id: 'boots_5', type: 'boots', itemId: 'dragon_boots' },
            { file: '6.png', id: 'boots_6', type: 'boots', itemId: 'shadow_boots' },
        ];

        // ============= GLOVES (16-24) =============
        const glovesFiles = [
            { file: '16.png', id: 'gloves_16', type: 'gloves', itemId: 'leather_gloves' },
            { file: '17.png', id: 'gloves_17', type: 'gloves', itemId: 'iron_gloves' },
            { file: '18.png', id: 'gloves_18', type: 'gloves', itemId: 'steel_gloves' },
            { file: '19.png', id: 'gloves_19', type: 'gloves', itemId: 'gold_gloves' },
            { file: '20.png', id: 'gloves_20', type: 'gloves', itemId: 'spell_gloves' },
            { file: '21.png', id: 'gloves_21', type: 'gloves', itemId: 'dragon_gloves' },
            { file: '22.png', id: 'gloves_22', type: 'gloves', itemId: 'assassin_gloves' },
            { file: '23.png', id: 'gloves_23', type: 'gloves', itemId: 'holy_gloves' },
            { file: '24.png', id: 'gloves_24', type: 'gloves', itemId: 'frost_gloves' },
        ];

        // ============= CHEST ARMOR (30-35) =============
        const chestFiles = [
            { file: '30.png', id: 'chest_30', type: 'chest', itemId: 'leather_armor' },
            { file: '31.png', id: 'chest_31', type: 'chest', itemId: 'iron_armor' },
            { file: '32.png', id: 'chest_32', type: 'chest', itemId: 'steel_armor' },
            { file: '33.png', id: 'chest_33', type: 'chest', itemId: 'gold_armor' },
            { file: '34.png', id: 'chest_34', type: 'chest', itemId: 'dragon_armor' },
            { file: '35.png', id: 'chest_35', type: 'chest', itemId: 'shadow_armor' },
        ];

        // ============= HELMETS (48-52) =============
        const helmetFiles = [
            { file: '48.png', id: 'helmet_48', type: 'helmet', itemId: 'leather_helmet' },
            { file: '49.png', id: 'helmet_49', type: 'helmet', itemId: 'iron_helmet' },
            { file: '50.png', id: 'helmet_50', type: 'helmet', itemId: 'steel_helmet' },
            { file: '51.png', id: 'helmet_51', type: 'helmet', itemId: 'crown' },
            { file: '52.png', id: 'helmet_52', type: 'helmet', itemId: 'dragon_helmet' },
        ];

        // ============= BOWS (86-89) =============
        const bowFiles = [
            { file: '86.png', id: 'bow_86', type: 'bow', itemId: 'short_bow' },
            { file: '87.png', id: 'bow_87', type: 'bow', itemId: 'long_bow' },
            { file: '88.png', id: 'bow_88', type: 'bow', itemId: 'crossbow' },
            { file: '89.png', id: 'bow_89', type: 'bow', itemId: 'windbow' },
        ];

        // ============= RINGS (90-100) =============
        const ringFiles = [
            { file: '90.png', id: 'ring_90', type: 'ring', itemId: 'ring_of_strength' },
            { file: '91.png', id: 'ring_91', type: 'ring', itemId: 'ring_of_dexterity' },
            { file: '92.png', id: 'ring_92', type: 'ring', itemId: 'ring_of_intellect' },
            { file: '93.png', id: 'ring_93', type: 'ring', itemId: 'ring_of_health' },
            { file: '94.png', id: 'ring_94', type: 'ring', itemId: 'ring_of_speed' },
            { file: '95.png', id: 'ring_95', type: 'ring', itemId: 'ring_of_crit' },
            { file: '96.png', id: 'ring_96', type: 'ring', itemId: 'ring_of_magic' },
            { file: '97.png', id: 'ring_97', type: 'ring', itemId: 'ring_of_protection' },
            { file: '98.png', id: 'ring_98', type: 'ring', itemId: 'ring_of_fire' },
            { file: '99.png', id: 'ring_99', type: 'ring', itemId: 'ring_of_life' },
            { file: '100.png', id: 'ring_100', type: 'ring', itemId: 'ring_of_power' },
        ];

        // ============= AMULETS (107-114) =============
        const amuletFiles = [
            { file: '107.png', id: 'amulet_107', type: 'amulet', itemId: 'amulet_of_health' },
            { file: '108.png', id: 'amulet_108', type: 'amulet', itemId: 'amulet_of_strength' },
            { file: '109.png', id: 'amulet_109', type: 'amulet', itemId: 'amulet_of_magic' },
            { file: '110.png', id: 'amulet_110', type: 'amulet', itemId: 'amulet_of_protection' },
            { file: '111.png', id: 'amulet_111', type: 'amulet', itemId: 'amulet_of_speed' },
            { file: '112.png', id: 'amulet_112', type: 'amulet', itemId: 'amulet_of_crit' },
            { file: '113.png', id: 'amulet_113', type: 'amulet', itemId: 'amulet_of_swiftness' },
            { file: '114.png', id: 'amulet_114', type: 'amulet', itemId: 'amulet_of_gods' },
        ];

        // ============= GROUND TEXTURES =============
        const groundFiles = [
            { file: '/lava-ground.png', id: 'lava-ground', type: 'ground' },
            { file: '/snow-ground.png', id: 'snow-ground', type: 'ground' },
            { file: '/grass-ground.png', id: 'grass-ground', type: 'ground' },
            { file: '/desert-ground.png', id: 'desert-ground', type: 'ground' },
            { file: '/lava/aaaaa.png', id: 'lava-texture', type: 'ground' },
        ];

        // ============= PROPS =============
        const propFiles = [
            // Stone variants
            { file: '/gameprops/moss-stone-1.png', id: 'stone1', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-2.png', id: 'stone2', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-3.png', id: 'stone3', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-4.png', id: 'stone4', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-5.png', id: 'stone5', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-6.png', id: 'stone6', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-7.png', id: 'stone7', type: 'stone', itemId: null },
            { file: '/gameprops/moss-stone-8.png', id: 'stone8', type: 'stone', itemId: null },
            // Snow stone
            { file: '/gameprops/snow-stone-1.png', id: 'snowstone1', type: 'snow_stone', itemId: null },
            { file: '/gameprops/snow-stone-2.png', id: 'snowstone2', type: 'snow_stone', itemId: null },
            { file: '/gameprops/snow-stone-3.png', id: 'snowstone3', type: 'snow_stone', itemId: null },
            { file: '/gameprops/snow-stone-4.png', id: 'snowstone4', type: 'snow_stone', itemId: null },
            { file: '/gameprops/snow-stone-5.png', id: 'snowstone5', type: 'snow_stone', itemId: null },
            // Bushes
            { file: '/gameprops/bush-1.png', id: 'bush1', type: 'bush', itemId: null },
            { file: '/gameprops/bush-2.png', id: 'bush2', type: 'bush', itemId: null },
            { file: '/gameprops/bush-3.png', id: 'bush3', type: 'bush', itemId: null },
            // Trees
            { file: '/gameprops/tree1.png', id: 'tree1', type: 'tree', itemId: null },
            { file: '/gameprops/tree2.png', id: 'tree2', type: 'tree', itemId: null },
            { file: '/gameprops/tree3.png', id: 'tree3', type: 'tree', itemId: null },
            // Interactables
            { file: '/gameprops/interactable/iron-ore.png', id: 'ore_iron', type: 'ore_iron', itemId: null },
            { file: '/gameprops/interactable/gold-ore.png', id: 'ore_gold', type: 'ore_gold', itemId: null },
            { file: '/gameprops/interactable/crystal-ore.png', id: 'ore_crystal', type: 'ore_crystal', itemId: null },
            { file: '/gameprops/interactable/lava-ore.png', id: 'ore_lava', type: 'ore_lava', itemId: null },
            { file: '/gameprops/interactable/void-ore.png', id: 'ore_void', type: 'ore_void', itemId: null },
        ];

        const VFX = [
            {
                file: '/vfx/burst.png',
                id: 'burst',
                type: 'vfx',
                animated: true,
                frameWidth: 1024,
                frameHeight: 1024,
                cols: 4,
                rows: 4,
                fps: 16
            },
            {
                file: '/vfx/explosion.png',
                id: 'explosion',
                type: 'vfx',
                animated: true,
                frameWidth: 256,
                frameHeight: 256,
                cols: 8,
                rows: 8,
                fps: 12
            },
            {
                file: '/vfx/explosion_v2.png',
                id: 'explosion_v2',
                type: 'vfx',
                animated: true,
                frameWidth: 400,
                frameHeight: 288,
                cols: 5,
                rows: 2,
                fps: 14
            },
            {
                file: '/vfx/blue-fire.png',
                id: 'blue_fire',
                type: 'vfx',
                animated: true,
                frameWidth: 126,
                frameHeight: 274,
                cols: 4,
                rows: 3,
                fps: 14
            }
            ];

        this.registerVFXMeta(VFX);

        // ============= DROP TEXTURES =============
        const dropFiles = [
            { file: '/void_essence.png', id: 'void_essence', type: 'void_essence', itemId: null },
            { file: '/gold.png', id: 'gold', type: 'currency', itemId: null },
        ];

        const allItems = [
            ...bootsFiles,
            ...glovesFiles,
            ...chestFiles,
            ...helmetFiles,
            ...bowFiles,
            ...ringFiles,
            ...amuletFiles,
            ...groundFiles,
            ...propFiles,
            ...dropFiles,
            ...VFX
        ];

        for (const item of allItems) {
            this.assetMeta.set(item.id, item);
        }

        const loadPromises = [];

        // Load all textures
        for (const item of allItems) {
            let path;
            if (item.file.startsWith('/')) {
                path = item.file;
            } else if (item.file.includes('.png')) {
                path = `/rpg/armour/${item.file}`;
            } else {
                // For non-image assets or special cases
                path = item.file;
            }

            loadPromises.push(this.loadTexture(item.id, path, item.type, item.itemId));
        }

        await Promise.all(loadPromises);

        // Organize textures by type for props
        for (const prop of propFiles) {
            if (!this.propTextures.has(prop.type)) {
                this.propTextures.set(prop.type, []);
            }
            const texture = this.textures.get(prop.id);
            if (texture) {
                this.propTextures.get(prop.type).push(texture);
            }
        }


        this.loaded = true;
        console.log('✓ All assets loaded successfully');
        console.log(`Total textures loaded: ${this.textures.size}`);
        console.log('Prop textures by type:', Array.from(this.propTextures.keys()));
    }

    registerVFXMeta(vfxList) {
        for (const vfx of vfxList) {
            this.vfxMeta.set(vfx.id, vfx);
        }
    }

    createRenderable(id, isAnimated) {
        const texture = this.textures.get(id);

        if (!texture) {
            console.warn("Missing texture:", id);
            return null;
        }

        // ✅ GET REAL META
        const meta = this.vfxMeta.get(id);

        const shouldAnimate = isAnimated || meta?.animated;

        if (!shouldAnimate) {
            return new Sprite(texture);
        }

        if (!meta) {
            console.warn("Missing VFX meta for:", id);
            return new Sprite(texture);
        }

        const frames = this.getAnimationFrames(
            id,
            meta.frameWidth,
            meta.frameHeight,
            meta.cols,
            meta.rows
        );

        if (!frames) return new Sprite(texture);

        const anim = new AnimatedSprite(frames);

        anim.animationSpeed = (meta.fps || 12) / 60;
        anim.loop = true;
        anim.play();
        anim.anchor.set(0.5);

        return anim;
    }

    getRandomPropTexture(type) {
        const textures = this.propTextures.get(type);
        if (!textures || textures.length === 0) {
            console.warn(`No textures found for type: ${type}`);
            return null;
        }
        return textures[Math.floor(Math.random() * textures.length)];
    }


    /**
     * 🆕 Get or create cached animation frames
     * This prevents re-slicing the same spritesheet repeatedly
     */
    getAnimationFrames(textureId, frameWidth, frameHeight, cols, rows) {
        const cacheKey = `${textureId}_${frameWidth}_${frameHeight}_${cols}_${rows}`;

        // Return cached frames if available
        if (this.animationFrames.has(cacheKey)) {
            return this.animationFrames.get(cacheKey);
        }

        const texture = this.textures.get(textureId);
        if (!texture || !texture.source) {
            console.error(`Texture "${textureId}" not ready for animation frames`);
            return null;
        }

        // Create and cache frames
        const frames = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const frame = new Rectangle(
                    col * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight
                );

                const frameTexture = new Texture({
                    source: texture.source,
                    frame: frame
                });

                frames.push(frameTexture);
            }
        }

        // Cache the frames
        this.animationFrames.set(cacheKey, frames);
        console.log(`📦 Cached ${frames.length} frames for: ${textureId}`);

        return frames;
    }

    async loadTexture(name, path, type = null, itemId = null) {
        try {
            // Skip if already loaded
            if (this.textures.has(name)) {
                return this.textures.get(name);
            }

            const texture = await Assets.load(path);
            this.textures.set(name, texture);

            // If this is an item texture, also store by itemId for easy lookup
            if (itemId && !this.textures.has(itemId)) {
                this.textures.set(itemId, texture);
            }

            return texture;
        } catch (error) {
            console.warn(`Failed to load ${name} from ${path}:`, error.message);
            return null;
        }
    }

    getTexture(name) {
        const texture = this.textures.get(name);
        if (!texture) {
            console.warn(`Texture not found: ${name}`);
        }
        return texture;
    }

    getAssetMeta(id) {
        return this.assetMeta.get(id);
    }

    getEditorAssets() {
        const result = [];

        for (const [id, meta] of this.assetMeta.entries()) {

            // ONLY world-placeable assets
            const allowed =
                meta.type === 'tree' ||
                meta.type === 'stone' ||
                meta.type === 'snow_stone' ||
                meta.type === 'bush' ||
                meta.type === 'vfx';

            if (!allowed) continue;

            result.push({
                id,
                type: meta.type,
                animated: !!meta.animated,
                texture: this.textures.get(id),
                meta
            });
        }

        return result;
    }
}

export const assetManager = new AssetManager();