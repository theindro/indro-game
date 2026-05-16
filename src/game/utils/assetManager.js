// utils/assetManager.js — thin facade over auto-discovered asset registry
import { Rectangle, Texture, Sprite, AnimatedSprite } from 'pixi.js';
import { assetRegistry } from '../assets/assetRegistry.js';
import { discoverAssetManifest, loadDiscoveredTextures } from '../assets/discoverAssets.js';
import { invalidateContentCache } from '../assets/contentFromMeta.js';
import { getPropTypeByAssetId } from '../world/propConfig.js';

/**
 * @param {string} relativePath
 */
function basenameFromPath(relativePath) {
    const name = relativePath.split('/').pop() ?? '';
    return name.replace(/\.[^.]+$/i, '');
}

class AssetManager {
    constructor() {
        /** @type {Map<string, import('pixi.js').Texture>} */
        this.textures = assetRegistry.textures;
        this.propTextures = assetRegistry.propTexturesByType;
        this.animationFrames = new Map();
        this.loaded = false;
    }

    async loadAssets() {
        if (this.loaded) return;

        const manifest = discoverAssetManifest();
        invalidateContentCache();
        await loadDiscoveredTextures();

        this.loaded = true;
        console.log('✓ Assets discovered and loaded', manifest);
        console.log(`  Textures: ${this.textures.size}, entries: ${assetRegistry.entries.size}`);
    }

    createRenderable(id, isAnimated) {
        const texture = this.getTexture(id);
        if (!texture) {
            console.warn('Missing texture:', id);
            return null;
        }

        const meta = assetRegistry.getMeta(id);
        const shouldAnimate = isAnimated || meta?.animated;

        if (!shouldAnimate) {
            return new Sprite(texture);
        }

        if (!meta?.frameWidth || !meta?.cols) {
            console.warn('Missing spritesheet meta for:', id);
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
        if (!textures?.length) {
            console.warn(`No textures found for type: ${type}`);
            return null;
        }
        return textures[Math.floor(Math.random() * textures.length)];
    }

    getAnimationFrames(textureId, frameWidth, frameHeight, cols, rows) {
        const cacheKey = `${textureId}_${frameWidth}_${frameHeight}_${cols}_${rows}`;

        if (this.animationFrames.has(cacheKey)) {
            return this.animationFrames.get(cacheKey);
        }

        const texture = this.getTexture(textureId);
        if (!texture?.source) {
            console.error(`Texture "${textureId}" not ready for animation frames`);
            return null;
        }

        const frames = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const frame = new Rectangle(
                    col * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight
                );
                frames.push(
                    new Texture({
                        source: texture.source,
                        frame,
                    })
                );
            }
        }

        this.animationFrames.set(cacheKey, frames);
        return frames;
    }

    getTexture(name) {
        const texture = this.textures.get(name);
        if (!texture) {
            console.warn(`Texture not found: ${name}`);
        }
        return texture;
    }

    /** Resolve a gameplay texture id (basename, alias, or registry id). */
    resolveTexture(textureId) {
        if (!textureId) return null;
        const direct = this.getTexture(textureId);
        if (direct) return direct;

        const entry = this.findEntryForTexture(textureId);
        if (!entry) return null;

        const resolved =
            (typeof entry.meta?.alias === 'string' && entry.meta.alias) ||
            (entry.sourcePath ? basenameFromPath(entry.sourcePath) : entry.id);

        return this.getTexture(resolved) ?? null;
    }

    getAssetMeta(id) {
        return assetRegistry.getMeta(id);
    }

    /**
     * Registry entry for a gameplay texture id (alias or basename).
     * @param {string} textureId
     */
    findEntryForTexture(textureId) {
        const direct = assetRegistry.getEntry(textureId);
        if (direct?.url) return direct;

        for (const entry of assetRegistry.getAllEntries()) {
            if (!entry.url) continue;
            const alias = /** @type {string|undefined} */ (entry.meta?.alias);
            const base = entry.sourcePath ? basenameFromPath(entry.sourcePath) : '';
            if (alias === textureId || base === textureId || entry.id === textureId) {
                return entry;
            }
        }
        return null;
    }

    /** Vite-resolved URL for editor thumbnails / React <img>. */
    getTexturePreviewUrl(textureId) {
        return this.findEntryForTexture(textureId)?.url ?? '';
    }

    getEditorAssets() {
        const result = [];
        const seen = new Set();
        const placeableTypes = new Set(['tree', 'stone', 'snow_stone', 'bush', 'vfx']);

        for (const entry of assetRegistry.getAllEntries()) {
            if (!entry.url || entry.kind === 'external') continue;

            const meta = entry.meta || {};
            const displayId =
                (typeof meta.alias === 'string' && meta.alias) ||
                (entry.sourcePath ? basenameFromPath(entry.sourcePath) : entry.id);

            if (seen.has(displayId)) continue;

            let type = meta.propType ?? meta.type;
            if (entry.category === 'props' || entry.category === 'vfx') {
                const propDef = getPropTypeByAssetId(displayId);
                if (propDef?.name) type = propDef.name;
            }
            if (!placeableTypes.has(type) && entry.category !== 'props' && entry.category !== 'vfx') {
                continue;
            }

            const texture = this.getTexture(displayId);
            if (!texture) continue;

            seen.add(displayId);
            const previewUrl = entry.url;

            result.push({
                id: displayId,
                type: type ?? entry.category,
                animated: !!meta.animated,
                texture,
                source: previewUrl,
                previewUrl,
                width: texture.width,
                height: texture.height,
                meta: { ...meta, file: previewUrl },
            });
        }

        return result.sort((a, b) => a.id.localeCompare(b.id));
    }
}

export const assetManager = new AssetManager();
