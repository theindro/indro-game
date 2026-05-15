/**
 * Vite build-time discovery of src/assets/** textures + JSON metadata.
 */
import { Assets } from 'pixi.js';
import { assetIdFromPath, categoryFromPath } from './assetId.js';
import { assetRegistry } from './assetRegistry.js';

const IMAGE_GLOB = import.meta.glob(
    '../../assets/**/*.{png,jpg,jpeg,webp,gif}',
    { query: '?url', import: 'default', eager: true }
);

const META_GLOB = import.meta.glob('../../assets/**/*.json', {
    eager: true,
    import: 'default',
});

/** Config-only JSON (not content definitions) */
const SKIP_META_NAMES = new Set([
    'biome_props',
    'biome_interactables',
    'loot_tables',
    'pack',
]);

/**
 * @param {string} globKey e.g. ../../assets/interactables/ore_iron.json
 */
function pathFromGlobKey(globKey) {
    const marker = '/assets/';
    const idx = globKey.replace(/\\/g, '/').indexOf(marker);
    if (idx === -1) {
        return globKey.replace(/^\.\.\/\.\.\/assets\//, '');
    }
    return globKey.slice(idx + marker.length);
}

/**
 * @param {Record<string, unknown>} meta
 * @param {string} relativePath
 */
function resolveMetaId(meta, relativePath) {
    if (typeof meta.id === 'string' && meta.id.length > 0) {
        return meta.id;
    }
    return assetIdFromPath(relativePath);
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
function basenameFromPath(relativePath) {
    const name = relativePath.split('/').pop() ?? '';
    return name.replace(/\.[^.]+$/i, '');
}

/**
 * @param {string} relativePath
 * @param {string} url
 */
function registerTextureAsset(relativePath, url) {
    const id = assetIdFromPath(relativePath);
    const category = categoryFromPath(relativePath) ?? 'misc';
    const alias = basenameFromPath(relativePath);

    assetRegistry.register({
        id,
        category,
        kind: 'texture',
        url,
        meta: {
            id,
            type: category,
            ...(alias && alias !== id ? { alias } : {}),
        },
        sourcePath: relativePath,
    });
}

/**
 * Register sidecar / folder meta and optional external texture URL.
 * @param {string} relativePath
 * @param {Record<string, unknown>} meta
 */
/**
 * Expand pack manifests (mod-friendly: drop a .pack.json in src/assets/).
 * @param {Record<string, unknown>} meta
 * @param {string} relativePath
 */
function registerPackManifest(relativePath, meta) {
    const entries = meta.entries;
    if (!Array.isArray(entries)) return;

    for (const raw of entries) {
        if (!raw || typeof raw !== 'object') continue;
        const e = /** @type {Record<string, unknown>} */ (raw);
        const id = typeof e.id === 'string' ? e.id : null;
        if (!id) continue;

        const textureSrc =
            (typeof e.textureSrc === 'string' && e.textureSrc) ||
            (typeof e.src === 'string' && e.src) ||
            '';

        const isSpritesheet = !!(e.spritesheet || e.animated || e.cols);

        assetRegistry.register({
            id,
            category: typeof e.category === 'string' ? e.category : categoryFromPath(relativePath) ?? 'misc',
            kind: isSpritesheet ? 'spritesheet' : textureSrc ? 'external' : 'texture',
            url: textureSrc,
            meta: {
                ...e,
                id,
                schema: isSpritesheet ? 'vfx' : e.schema,
                animated: isSpritesheet,
            },
            sourcePath: `${relativePath}#${id}`,
        });
    }
}

function registerMetaAsset(relativePath, meta) {
    const baseName = relativePath.split('/').pop() ?? '';
    if (SKIP_META_NAMES.has(baseName.replace(/\.json$/i, ''))) {
        return;
    }

    if (meta.schema === 'texture_pack' || meta.schema === 'spritesheet_pack') {
        registerPackManifest(relativePath, meta);
        return;
    }

    if (meta.schema === 'prop_definitions' && Array.isArray(meta.definitions)) {
        if (!assetRegistry.metaBySchema.has('prop')) {
            assetRegistry.metaBySchema.set('prop', {});
        }
        const bucket = assetRegistry.metaBySchema.get('prop');
        for (const def of meta.definitions) {
            if (!def || typeof def !== 'object') continue;
            const typeKey = def.typeKey ?? def.name;
            if (!typeKey) continue;
            bucket[typeKey] = { schema: 'prop', ...def, typeKey };
        }
        return;
    }

    const id = resolveMetaId(meta, relativePath);
    const category =
        (typeof meta.category === 'string' && meta.category) ||
        categoryFromPath(relativePath) ||
        'misc';

    const textureSrc =
        (typeof meta.textureSrc === 'string' && meta.textureSrc) ||
        (typeof meta.src === 'string' && meta.src) ||
        null;

    const kind =
        meta.spritesheet || meta.animated || meta.schema === 'spritesheet'
            ? 'spritesheet'
            : textureSrc
              ? 'external'
              : 'texture';

    assetRegistry.register({
        id,
        category,
        kind,
        url: textureSrc ?? '',
        meta: {
            ...meta,
            id,
            texture: typeof meta.texture === 'string' ? meta.texture : id,
        },
        sourcePath: relativePath,
    });
}

/**
 * Discover files and register entries (textures loaded separately).
 */
export function discoverAssetManifest() {
    assetRegistry.clear();

    for (const [globKey, url] of Object.entries(IMAGE_GLOB)) {
        const rel = pathFromGlobKey(globKey);
        registerTextureAsset(rel, /** @type {string} */ (url));
    }

    for (const [globKey, meta] of Object.entries(META_GLOB)) {
        if (!meta || typeof meta !== 'object') continue;
        const rel = pathFromGlobKey(globKey);
        registerMetaAsset(rel, /** @type {Record<string, unknown>} */ (meta));
    }

    return {
        imageCount: Object.keys(IMAGE_GLOB).length,
        metaCount: Object.keys(META_GLOB).length,
        entryCount: assetRegistry.entries.size,
    };
}

/**
 * Load all registered textures into Pixi and build prop-type groupings.
 */
export async function loadDiscoveredTextures() {
    const loadTasks = [];

    for (const entry of assetRegistry.getAllEntries()) {
        if (entry.kind === 'spritesheet') {
            loadTasks.push(loadSpritesheetEntry(entry));
            continue;
        }

        const url = resolveEntryUrl(entry);
        if (!url) continue;

        loadTasks.push(
            (async () => {
                try {
                    const texture = await Assets.load(url);
                    assetRegistry.setTexture(entry.id, texture);

                    const propType = /** @type {string|undefined} */ (entry.meta?.propType);
                    if (propType) {
                        assetRegistry.addPropTexture(propType, texture);
                    }

                    const legacyType = /** @type {string|undefined} */ (entry.meta?.type);
                    if (legacyType && legacyType !== propType) {
                        assetRegistry.addPropTexture(legacyType, texture);
                    }
                } catch (err) {
                    console.warn(`[assets] Failed to load ${entry.id} from ${url}:`, err);
                }
            })()
        );
    }

    await Promise.all(loadTasks);

    // Group props by variant lists declared in meta.schema === 'prop'
    const propContent = assetRegistry.getContentBySchema('prop');
    for (const def of Object.values(propContent)) {
        const name = /** @type {{ name?: string, variants?: string[] }} */ (def).name;
        const variants = /** @type {{ variants?: string[] }} */ (def).variants;
        if (!name || !variants?.length) continue;

        for (const variantId of variants) {
            const tex = assetRegistry.getTexture(variantId);
            if (tex) assetRegistry.addPropTexture(name, tex);
        }
    }

    assetRegistry.loaded = true;
}

/**
 * @param {import('./assetRegistry.js').AssetEntry} entry
 */
function resolveEntryUrl(entry) {
    if (entry.url) return entry.url;

    const lookupId =
        (typeof entry.meta?.texture === 'string' && entry.meta.texture) ||
        (typeof entry.meta?.id === 'string' && entry.meta.id) ||
        entry.id;

    const sibling = assetRegistry.getEntry(lookupId);
    if (sibling?.url) return sibling.url;

    for (const candidate of assetRegistry.getAllEntries()) {
        if (!candidate.url || candidate.kind === 'external') continue;
        const alias = /** @type {string|undefined} */ (candidate.meta?.alias);
        const base = candidate.sourcePath ? basenameFromPath(candidate.sourcePath) : '';
        if (alias === lookupId || base === lookupId || candidate.id === lookupId) {
            return candidate.url;
        }
        if (candidate.id.endsWith(`.${lookupId}`)) {
            return candidate.url;
        }
    }

    return '';
}

/**
 * @param {import('./assetRegistry.js').AssetEntry} entry
 */
async function loadSpritesheetEntry(entry) {
    const m = entry.meta;
    const url =
        entry.url ||
        (typeof m.textureSrc === 'string' && m.textureSrc) ||
        (typeof m.src === 'string' && m.src);
    if (!url) {
        console.warn(`[assets] Spritesheet ${entry.id} missing url/textureSrc`);
        return;
    }

    try {
        const texture = await Assets.load(url);
        assetRegistry.setTexture(entry.id, texture);
        entry.meta = {
            ...m,
            animated: true,
            frameWidth: m.frameWidth ?? m.frameWidth,
            frameHeight: m.frameHeight,
            cols: m.cols,
            rows: m.rows,
            fps: m.fps ?? 12,
        };
    } catch (err) {
        console.warn(`[assets] Failed to load spritesheet ${entry.id}:`, err);
    }
}
