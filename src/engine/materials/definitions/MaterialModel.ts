import type { Color } from '../../definitions/Primitives';
import type { MaterialId, MaterialName } from './MaterialIdentity'
import type { MaterialPhase, MaterialPhaseBehavior } from './MaterialPhases'
import type { MaterialState } from './MaterialState'
import type { MaterialTransitions } from './MaterialTransitions'
import type { MaterialTag } from './MaterialTags'
import type { MaterialVariant } from './MaterialVariants'

export interface MaterialDefinition {
    id: MaterialId;
    name: MaterialName;
    colors: readonly [Color, Color, Color, Color];
    variants?: readonly MaterialVariant[];

    state: MaterialState;

    phase: MaterialPhase;
    phaseBehavior: MaterialPhaseBehavior;

    physics: MaterialPhysics;
    transitions?: MaterialTransitions;
    tags?: readonly MaterialTag[];
}

export interface MaterialPhysics {
    // Controls the physical density, allows lighter materials to be pushed aside by denser ones
    density: number;
    // Used for burnability and damage resistance
    durability: number;
    temperature: {
        // Resistance to absorbing neighbor temperatures | low = fast conductor, high = slow conductor
        specificHeat: number;
        // Desired temperature for materials (spawns at this temp, tries to return to it)
        restingTemperature: number;
        // How strongly this material tries to return to it's restingTemperature
        restingStrength: number;
    }
}