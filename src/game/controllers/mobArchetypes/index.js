import { RusherArchetype } from './RusherArchetype.js';
import { TankArchetype } from './TankArchetype.js';
import { RangedArchetype } from './RangedArchetype.js';
import * as PIXI from 'pixi.js';
import {ExploderArchetype} from "./ExploderArchetype.js";

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
        speedMultiplier: 1.2,
        damage: 1.5,
        knockbackResist: 0.2,
        size: 11
    },
    [ARCHETYPES.TANK]: {
        hpMultiplier: 2.5,
        speedMultiplier: 1,
        damage: 1.2,
        knockbackResist: 0.8,
        size: 24
    },
    [ARCHETYPES.RANGED]: {
        hpMultiplier: 0.9,
        speedMultiplier: 0.9,
        damage: 1.3,
        knockbackResist: 0.3,
        size: 12
    },
    [ARCHETYPES.EXPLODER]: {
        hpMultiplier: 0.6,
        speedMultiplier: 1.2,
        damage: 20,  // Explosion damage
        knockbackResist: 0.1,
        size: 13
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

    mob.c.addChild(textLabel);
    mob.archetypeLabel = textLabel;
}
