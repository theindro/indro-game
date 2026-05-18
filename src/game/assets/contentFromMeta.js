/**
 * Builds gameplay content tables from discovered metadata (schema-driven).
 */
import { assetRegistry } from './assetRegistry.js';
import {
    INTERACTABLE_PROP_TYPES as STATIC_INTERACTABLE,
    BIOME_INTERACTABLE_CONFIG as STATIC_BIOME_INTERACTABLE,
    LOOT_TABLES as STATIC_LOOT,
} from '../world/interactablePropConfig.data.js';
import {
    PROP_TYPES as STATIC_PROP_TYPES,
    BIOME_PROP_CONFIG as STATIC_BIOME_PROPS,
} from '../world/propConfig.data.js';

/** @param {Record<string, unknown>} raw */
function normalizeInteractableDef(raw) {
    const id = String(raw.id);
    const def = { ...raw, id };

    if (typeof def.texture !== 'string') {
        def.texture = id;
    }

    if (typeof def.glowColor === 'string' && def.glowColor.startsWith('#')) {
        def.glowColor = parseInt(def.glowColor.slice(1), 16);
    }

    if (def.collision === undefined) {
        def.collision = true;
    }
    if (def.castShadow === undefined) {
        def.castShadow = true;
    }
    if (def.category === 'chest') {
        if (def.harvestTime === undefined) def.harvestTime = 2;
        if (def.lootToGround === undefined) def.lootToGround = true;
    }

    return def;
}

/** @param {Record<string, unknown>} raw */
function normalizePropTypeDef(raw) {
    const name = raw.name ?? raw.id;
    return {
        name,
        variants: Array.isArray(raw.variants) ? raw.variants : [],
        collision: raw.collision !== false,
        collisionType: raw.collisionType ?? 'auto',
        minDistance: raw.minDistance ?? 80,
        margin: raw.margin ?? 0.8,
        damageOnTouch: raw.damageOnTouch ?? 0,
        scaleRange: raw.scaleRange ?? { min: 0.8, max: 1.0 },
    };
}

let _interactableTypes = null;
let _biomeInteractables = null;
let _lootTables = null;
let _propTypes = null;
let _biomeProps = null;

export function invalidateContentCache() {
    _interactableTypes = null;
    _biomeInteractables = null;
    _lootTables = null;
    _propTypes = null;
    _biomeProps = null;
}

/**
 * Merged interactable definitions (static + discovered meta).
 */
export function getInteractablePropTypes() {
    if (_interactableTypes) return _interactableTypes;

    const discovered = assetRegistry.getContentBySchema('interactable');
    const merged = { ...STATIC_INTERACTABLE };

    for (const [key, raw] of Object.entries(discovered)) {
        const id = raw.id ?? key;
        merged[id] = normalizeInteractableDef(raw);
    }

    _interactableTypes = merged;
    return merged;
}

export function getBiomeInteractableConfig() {
    if (_biomeInteractables) return _biomeInteractables;

    const fromMeta = assetRegistry.getContentBySchema('biome_interactables');
    if (fromMeta && Object.keys(fromMeta).length > 0) {
        _biomeInteractables = /** @type {typeof STATIC_BIOME_INTERACTABLE} */ (fromMeta);
        return _biomeInteractables;
    }

    _biomeInteractables = STATIC_BIOME_INTERACTABLE;
    return _biomeInteractables;
}

export function getLootTables() {
    if (_lootTables) return _lootTables;

    const fromMeta = assetRegistry.getContentBySchema('loot_tables');
    if (fromMeta && Object.keys(fromMeta).length > 0) {
        _lootTables = /** @type {typeof STATIC_LOOT} */ (fromMeta);
        return _lootTables;
    }

    _lootTables = STATIC_LOOT;
    return _lootTables;
}

/**
 * Merged procedural prop type definitions.
 */
export function getPropTypes() {
    if (_propTypes) return _propTypes;

    const discovered = assetRegistry.getContentBySchema('prop');
    const merged = { ...STATIC_PROP_TYPES };

    for (const [key, raw] of Object.entries(discovered)) {
        const typeKey = raw.typeKey ?? key;
        merged[typeKey] = normalizePropTypeDef(raw);
    }

    _propTypes = merged;
    return _propTypes;
}

export function getBiomePropConfig() {
    if (_biomeProps) return _biomeProps;

    const fromMeta = assetRegistry.getContentBySchema('biome_props');
    if (fromMeta && Object.keys(fromMeta).length > 0) {
        _biomeProps = /** @type {typeof STATIC_BIOME_PROPS} */ (fromMeta);
        return _biomeProps;
    }

    _biomeProps = STATIC_BIOME_PROPS;
    return _biomeProps;
}
