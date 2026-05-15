/**
 * Central registry for discovered textures, spritesheets, and metadata.
 */

/** @typedef {'texture' | 'spritesheet' | 'external'} AssetKind */

/**
 * @typedef {object} AssetEntry
 * @property {string} id
 * @property {string} category
 * @property {AssetKind} kind
 * @property {string} url
 * @property {Record<string, unknown>} meta
 * @property {string} [sourcePath]
 */

export class AssetRegistry {
    constructor() {
        /** @type {Map<string, AssetEntry>} */
        this.entries = new Map();
        /** @type {Map<string, import('pixi.js').Texture>} */
        this.textures = new Map();
        /** @type {Map<string, string[]>} */
        this.propTexturesByType = new Map();
        /** @type {Map<string, Record<string, unknown>>} */
        this.metaBySchema = new Map();
        this.loaded = false;
    }

    /**
     * @param {AssetEntry} entry
     */
    register(entry) {
        const id = entry.id;
        if (!id) return;

        const existing = this.entries.get(id);
        if (existing) {
            this.entries.set(id, {
                ...existing,
                ...entry,
                meta: {...(existing.meta || {}), ...(entry.meta || {})},
            });
        } else {
            this.entries.set(id, entry);
        }

        const schema = /** @type {string|undefined} */ (entry.meta?.schema);
        if (schema) {
            if (!this.metaBySchema.has(schema)) {
                this.metaBySchema.set(schema, {});
            }
            const bucket = this.metaBySchema.get(schema);
            const contentId = /** @type {string} */ (entry.meta?.id ?? id);
            bucket[contentId] = {...(bucket[contentId] || {}), ...entry.meta, texture: entry.meta.texture ?? contentId};
        }
    }

    /**
     * @param {string} id
     * @param {import('pixi.js').Texture} texture
     */
    setTexture(id, texture) {
        this.textures.set(id, texture);
        const entry = this.entries.get(id);
        const alias = /** @type {string|undefined} */ (entry?.meta?.alias);
        if (alias && alias !== id) {
            this.textures.set(alias, texture);
        }
        if (entry?.meta?.itemId) {
            this.textures.set(entry.meta.itemId, texture);
        }
    }

    /**
     * @param {string} type
     * @param {import('pixi.js').Texture} texture
     */
    addPropTexture(type, texture) {
        if (!type || !texture) return;
        if (!this.propTexturesByType.has(type)) {
            this.propTexturesByType.set(type, []);
        }
        this.propTexturesByType.get(type).push(texture);
    }

    getEntry(id) {
        return this.entries.get(id);
    }

    getTexture(id) {
        return this.textures.get(id) ?? null;
    }

    getMeta(id) {
        return this.entries.get(id)?.meta ?? null;
    }

    /**
     * @param {string} schema e.g. interactable, prop, vfx, item
     */
    getContentBySchema(schema) {
        return this.metaBySchema.get(schema) ?? {};
    }

    getAllEntries() {
        return [...this.entries.values()];
    }

    clear() {
        this.entries.clear();
        this.textures.clear();
        this.propTexturesByType.clear();
        this.metaBySchema.clear();
        this.loaded = false;
    }
}

export const assetRegistry = new AssetRegistry();
