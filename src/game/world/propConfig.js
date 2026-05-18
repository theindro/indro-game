// Re-exports static tables + data-driven getters (populated after asset load).
export {
    BIOME_PROP_CONFIG,
    PROP_TYPES,
    PROP_SHADOW_OVERRIDES,
    getPropShadowOverride,
} from './propConfig.data.js';

import { getPropTypes, getBiomePropConfig } from '../assets/contentFromMeta.js';

export { getPropTypes, getBiomePropConfig };

/** Resolve procedural prop definition from a placed asset id (e.g. tree2, snowstone1). */
export function getPropTypeByAssetId(assetId) {
    if (!assetId) return null;
    const types = getPropTypes();

    for (const def of Object.values(types)) {
        if (def.name === assetId) return def;
        if (def.variants?.includes(assetId)) return def;
    }
    return null;
}
