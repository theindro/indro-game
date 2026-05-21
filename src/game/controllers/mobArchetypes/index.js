import { RusherArchetype } from './RusherArchetype.js';
import { TankArchetype } from './TankArchetype.js';
import { RangedArchetype } from './RangedArchetype.js';
import { ExploderArchetype } from './ExploderArchetype.js';
import { BatArchetype } from './BatArchetype.js';
import * as PIXI from 'pixi.js';
import {
    VOID_SHAPE_2,
    VOID_SHAPE_4, VOID_SHAPE_5,
    VOID_SHAPE_6,
    VOID_SHAPE_7,
    VOID_SHAPE_BAT,
} from '../../monsters.js';

export const ARCHETYPES = {
    RUSHER: 'rusher',
    TANK: 'tank',
    RANGED: 'ranged',
    EXPLODER: 'exploder',
    BAT: 'bat',
    //KITER: 'kiter',
    //SUMMONER: 'summoner',
    //SHIELDED: 'shielded'
};

export const archetypeMap = {
    [ARCHETYPES.RUSHER]: RusherArchetype,
    [ARCHETYPES.TANK]: TankArchetype,
    [ARCHETYPES.RANGED]: RangedArchetype,
    [ARCHETYPES.EXPLODER]: ExploderArchetype,
    [ARCHETYPES.BAT]: BatArchetype,
};

// Base stats for each archetype
export const ARCHETYPE_STATS = {
    [ARCHETYPES.RUSHER]: {
        hpMultiplier: 0.7,
        speedMultiplier: 0.58,
        damage: 3,
        size: 11,
        exp: 30,
        type: VOID_SHAPE_2
    },
    [ARCHETYPES.TANK]: {
        hpMultiplier: 2.5,
        speedMultiplier: 0.48,
        damage: 2,
        size: 40,
        exp: 30,
        type: VOID_SHAPE_5
    },
    [ARCHETYPES.RANGED]: {
        hpMultiplier: 0.9,
        speedMultiplier: 0.52,
        damage: 5,
        size: 16,
        exp: 30,
        type: VOID_SHAPE_6
    },
    [ARCHETYPES.EXPLODER]: {
        hpMultiplier: 0.6,
        speedMultiplier: 0.56,
        damage: 20,  // Explosion damage
        size: 13,
        exp: 30,
        type: VOID_SHAPE_4
    },
    [ARCHETYPES.BAT]: {
        hpMultiplier: 0.45,
        speedMultiplier: 0.78,
        damage: 2,
        size: 16,
        exp: 28,
        type: VOID_SHAPE_BAT,
    },
};

/** Weighted random pick for procedural spawns (excludes tank in open world). */
export const SPAWN_ARCHETYPE_WEIGHTS = [
    { id: ARCHETYPES.RUSHER, weight: 34 },
    { id: ARCHETYPES.RANGED, weight: 26 },
    { id: ARCHETYPES.EXPLODER, weight: 18 },
    { id: ARCHETYPES.BAT, weight: 22 },
    { id: ARCHETYPES.TANK, weight: 14 },
];

/**
 * @param {number} unit [0,1)
 * @param {string} [biome]
 */
export function pickSpawnArchetype(unit, biome = 'forest') {
    let pool = SPAWN_ARCHETYPE_WEIGHTS;
    if (biome === 'forest') {
        pool = [
            { id: ARCHETYPES.RUSHER, weight: 28 },
            { id: ARCHETYPES.RANGED, weight: 22 },
            { id: ARCHETYPES.EXPLODER, weight: 14 },
            { id: ARCHETYPES.BAT, weight: 36 },
            { id: ARCHETYPES.TANK, weight: 14 },
        ];
    }
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let t = unit * total;
    for (const entry of pool) {
        t -= entry.weight;
        if (t <= 0) return entry.id;
    }
    return pool[pool.length - 1].id;
}

export function applyArchetypeVisuals(mob, archetype, biome) {
    if (!mob.c) return;

    // Add archetype-specific visual indicators
    const indicator = new PIXI.Graphics();

    // Color mapping for text
    let textColor = '#ffffff';

    // Add custom mob design
    switch(archetype) {
        case ARCHETYPES.RUSHER:
            break;
        case ARCHETYPES.TANK:
            break;
        case ARCHETYPES.RANGED:
            break;
        case ARCHETYPES.EXPLODER:
            break;
        case ARCHETYPES.BAT:
            break;
    }

    mob.c.addChild(indicator);
    mob.archetypeIndicator = indicator;

    // Add colored text label
    const textLabel = new PIXI.Text(archetype.toUpperCase(), {
        fontSize: 10,
        fontWeight: 'bold',
        fill: textColor,
        align: 'center'
    });

    textLabel.anchor.set(0.5, 0);
    textLabel.x = 0;
    textLabel.y = 16;

    //mob.c.addChild(textLabel);
    mob.archetypeLabel = textLabel;
}
