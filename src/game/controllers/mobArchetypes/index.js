import { RusherArchetype } from './RusherArchetype.js';
import { TankArchetype } from './TankArchetype.js';
import { RangedArchetype } from './RangedArchetype.js';
import {ExploderArchetype} from "./ExploderArchetype.js";
import * as PIXI from 'pixi.js';
import {VOID_SHAPE_5, VOID_SHAPE_3, VOID_SHAPE_2, VOID_SHAPE_4} from "../../monsters.js";

export const ARCHETYPES = {
    RUSHER: 'rusher',
    TANK: 'tank',
    RANGED: 'ranged',
    EXPLODER: 'exploder',
    //KITER: 'kiter',
    //SUMMONER: 'summoner',
    //SHIELDED: 'shielded'
};

export const archetypeMap = {
    [ARCHETYPES.RUSHER]: RusherArchetype,
    [ARCHETYPES.TANK]: TankArchetype,
    [ARCHETYPES.RANGED]: RangedArchetype,
    [ARCHETYPES.EXPLODER]: ExploderArchetype,
};

// Base stats for each archetype
export const ARCHETYPE_STATS = {
    [ARCHETYPES.RUSHER]: {
        hpMultiplier: 0.7,
        speedMultiplier: 0.5,
        damage: 3,
        size: 11,
        exp: 30,
        type: VOID_SHAPE_2
    },
    [ARCHETYPES.TANK]: {
        hpMultiplier: 2.5,
        speedMultiplier: 0.4,
        damage: 2,
        size: 24,
        exp: 30,
        type: VOID_SHAPE_5
    },
    [ARCHETYPES.RANGED]: {
        hpMultiplier: 0.9,
        speedMultiplier: 0.4,
        damage: 5,
        size: 16,
        exp: 30,
        type: VOID_SHAPE_3
    },
    [ARCHETYPES.EXPLODER]: {
        hpMultiplier: 0.6,
        speedMultiplier: 0.5,
        damage: 20,  // Explosion damage
        size: 13,
        exp: 30,
        type: VOID_SHAPE_4
    }
};

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
