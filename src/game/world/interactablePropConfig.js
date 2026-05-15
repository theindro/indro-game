// Re-exports static tables + data-driven getters (populated after asset load).
export {
    BIOME_INTERACTABLE_CONFIG,
    LOOT_TABLES,
    INTERACTABLE_PROP_TYPES,
} from './interactablePropConfig.data.js';

export {
    getInteractablePropTypes,
    getBiomeInteractableConfig,
    getLootTables,
} from '../assets/contentFromMeta.js';
