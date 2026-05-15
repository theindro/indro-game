/**
 * Chunk landscape profiles — seeded “micro-biomes” inside each world biome.
 * Each chunk rolls one profile (weighted) and uses its layout + pools for props,
 * interactables, and mob packs (Minecraft-style regional identity).
 */

/** @typedef {'clusters'|'sparse'|'clearing'|'perimeter_ring'|'wet_corner'|'stone_field'|'ancient_grove'} ChunkLayout */

/**
 * @typedef {object} ChunkLandscapeProfile
 * @property {string} id
 * @property {string} label
 * @property {number} weight
 * @property {number} density
 * @property {number} [basePropCount]
 * @property {ChunkLayout} layout
 * @property {{ min: number, max: number }} [clusterCount]
 * @property {{ min: number, max: number }} [clusterRadius]
 * @property {Array<{ type: string, weight: number }>} props
 * @property {Record<string, number>} [spacingScale]
 * @property {Record<string, number>} [variantBias]
 * @property {Record<string, number>} [interactableScale]
 * @property {number} [mobPackBonus]
 * @property {number} [mobPackCountMul]
 */

/** @type {Record<string, ChunkLandscapeProfile[]>} */
export const BIOME_CHUNK_PROFILES = {
    forest: [
        {
            id: 'dense_forest',
            label: 'Dense Forest',
            weight: 22,
            density: 1.45,
            basePropCount: 134,
            layout: 'clusters',
            clusterCount: { min: 13, max: 15 },
            clusterRadius: { min: 90, max: 170 },
            props: [
                { type: 'TREE', weight: 52 },
                { type: 'BUSH', weight: 33 },
                { type: 'STONE', weight: 15 },
            ],
            spacingScale: { TREE: 0.42, BUSH: 0.48, STONE: 0.3 },
            interactableScale: { wood: 1.2, herb: 0.9, metal: 0.7, container: 0.8 },
            mobPackBonus: 0.12,
            mobPackCountMul: 1.15,
        },
        {
            id: 'light_forest',
            label: 'Light Forest',
            weight: 20,
            density: 0.55,
            basePropCount: 12,
            layout: 'sparse',
            props: [
                { type: 'TREE', weight: 35 },
                { type: 'BUSH', weight: 40 },
                { type: 'STONE', weight: 25 },
            ],
            spacingScale: { TREE: 1.1, BUSH: 1.2, STONE: 0.9 },
            interactableScale: { wood: 0.7, herb: 1.1, chest: 0.9 },
            mobPackBonus: 0.04,
        },
        {
            id: 'ancient_grove',
            label: 'Ancient Grove',
            weight: 14,
            density: 1.05,
            basePropCount: 22,
            layout: 'ancient_grove',
            clusterCount: { min: 1, max: 2 },
            clusterRadius: { min: 140, max: 220 },
            props: [
                { type: 'TREE', weight: 70 },
                { type: 'BUSH', weight: 18 },
                { type: 'STONE', weight: 12 },
            ],
            spacingScale: { TREE: 0.55, BUSH: 0.7, STONE: 0.45 },
            variantBias: { tree2: 2.5, tree3: 2.5, tree1: 0.6 },
            interactableScale: { herb: 1.35, wood: 1.1, chest: 1.2, metal: 0.5 },
            mobPackBonus: 0.08,
        },
        {
            id: 'rocky_forest',
            label: 'Rocky Forest',
            weight: 16,
            density: 0.95,
            basePropCount: 20,
            layout: 'stone_field',
            clusterCount: { min: 2, max: 4 },
            clusterRadius: { min: 60, max: 110 },
            props: [
                { type: 'STONE', weight: 48 },
                { type: 'TREE', weight: 28 },
                { type: 'BUSH', weight: 24 },
            ],
            spacingScale: { STONE: 0.32, TREE: 0.85, BUSH: 0.75 },
            interactableScale: { metal: 1.45, wood: 0.6, herb: 0.7 },
            mobPackBonus: 0.1,
        },
        {
            id: 'swamp_forest',
            label: 'Swamp Forest',
            weight: 14,
            density: 1.1,
            basePropCount: 26,
            layout: 'wet_corner',
            props: [
                { type: 'BUSH', weight: 38 },
                { type: 'TREE', weight: 32 },
                { type: 'STONE', weight: 30 },
            ],
            spacingScale: { TREE: 0.6, BUSH: 0.45, STONE: 0.5 },
            interactableScale: { herb: 1.5, wood: 1.25, container: 1.2, metal: 0.4 },
            mobPackBonus: 0.14,
            mobPackCountMul: 1.1,
        },
        {
            id: 'mushroom_glade',
            label: 'Mushroom Glade',
            weight: 14,
            density: 0.9,
            basePropCount: 24,
            layout: 'perimeter_ring',
            props: [
                { type: 'TREE', weight: 40 },
                { type: 'BUSH', weight: 45 },
                { type: 'STONE', weight: 15 },
            ],
            spacingScale: { TREE: 0.7, BUSH: 0.55, STONE: 0.65 },
            variantBias: { bush2: 1.8, bush3: 1.8, herb_green: 1 },
            interactableScale: { herb: 1.6, wood: 0.5, chest: 0.85, container: 0.9 },
            mobPackBonus: 0.05,
        },
    ],

    desert: [
        {
            id: 'dune_field',
            label: 'Dune Field',
            weight: 40,
            density: 0.45,
            basePropCount: 8,
            layout: 'sparse',
            props: [{ type: 'STONE', weight: 100 }],
            spacingScale: { STONE: 0.85 },
            interactableScale: { metal: 1.3, chest: 1.1 },
        },
        {
            id: 'rocky_badlands',
            label: 'Rocky Badlands',
            weight: 35,
            density: 0.75,
            basePropCount: 14,
            layout: 'stone_field',
            clusterCount: { min: 2, max: 3 },
            clusterRadius: { min: 70, max: 130 },
            props: [{ type: 'STONE', weight: 100 }],
            spacingScale: { STONE: 0.35 },
            interactableScale: { metal: 1.5, chest: 1.2 },
            mobPackBonus: 0.15,
        },
        {
            id: 'oasis_edge',
            label: 'Oasis Edge',
            weight: 25,
            density: 0.65,
            basePropCount: 10,
            layout: 'wet_corner',
            props: [
                { type: 'BUSH', weight: 60 },
                { type: 'STONE', weight: 40 },
            ],
            spacingScale: { BUSH: 0.6, STONE: 0.7 },
            interactableScale: { herb: 1.4, wood: 0.8 },
        },
    ],

    ice: [
        {
            id: 'frozen_expanse',
            label: 'Frozen Expanse',
            weight: 50,
            density: 0.4,
            basePropCount: 6,
            layout: 'sparse',
            props: [{ type: 'SNOW_STONE', weight: 100 }],
            spacingScale: { SNOW_STONE: 0.8 },
        },
        {
            id: 'ice_spire_field',
            label: 'Ice Spire Field',
            weight: 30,
            density: 0.85,
            basePropCount: 16,
            layout: 'stone_field',
            clusterCount: { min: 2, max: 4 },
            clusterRadius: { min: 80, max: 140 },
            props: [{ type: 'SNOW_STONE', weight: 100 }],
            spacingScale: { SNOW_STONE: 0.38 },
        },
        {
            id: 'blizzard_grove',
            label: 'Blizzard Grove',
            weight: 20,
            density: 0.7,
            basePropCount: 12,
            layout: 'clusters',
            clusterCount: { min: 2, max: 3 },
            clusterRadius: { min: 100, max: 160 },
            props: [{ type: 'SNOW_STONE', weight: 70 }, { type: 'STONE', weight: 30 }],
            spacingScale: { SNOW_STONE: 0.5, STONE: 0.6 },
            interactableScale: { chest: 1.2, metal: 1.1 },
        },
    ],

    lava: [
        {
            id: 'ash_plains',
            label: 'Ash Plains',
            weight: 45,
            density: 0.5,
            basePropCount: 10,
            layout: 'sparse',
            props: [{ type: 'STONE', weight: 100 }],
            spacingScale: { STONE: 0.75 },
            interactableScale: { metal: 1.2 },
            mobPackBonus: 0.18,
        },
        {
            id: 'obsidian_ridge',
            label: 'Obsidian Ridge',
            weight: 35,
            density: 1.0,
            basePropCount: 18,
            layout: 'stone_field',
            clusterCount: { min: 2, max: 4 },
            clusterRadius: { min: 65, max: 120 },
            props: [{ type: 'STONE', weight: 100 }],
            spacingScale: { STONE: 0.3 },
            mobPackBonus: 0.2,
            mobPackCountMul: 1.25,
        },
        {
            id: 'scorched_canyon',
            label: 'Scorched Canyon',
            weight: 20,
            density: 0.85,
            basePropCount: 14,
            layout: 'clearing',
            props: [{ type: 'STONE', weight: 85 }, { type: 'BUSH', weight: 15 }],
            spacingScale: { STONE: 0.45, BUSH: 0.9 },
        },
    ],
};

/** Fallback when biome has no profiles */
export const DEFAULT_CHUNK_PROFILE = {
    id: 'default',
    label: 'Wilderness',
    weight: 1,
    density: 0.75,
    basePropCount: 18,
    layout: 'sparse',
    props: [
        { type: 'STONE', weight: 40 },
        { type: 'TREE', weight: 35 },
        { type: 'BUSH', weight: 25 },
    ],
};
