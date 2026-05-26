import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const BrassPowder: MaterialDefinition = {
    id: MaterialIds.brass_powder,
    name: 'brass_powder',
    colors: [
        { r: 196, g: 112, b: 56, a: 1 },
        { r: 224, g: 168, b: 72, a: 1 },
        { r: 158, g: 82, b: 42, a: 1 },
        { r: 210, g: 140, b: 60, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 6.0,
            mobility: 0.06,
            flow: 0.025,
            cohesion: 0.008
        }
    },
    physics: {
        density: 1.7,
        durability: 1,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'brass_molten',
            condition: { temperature: 0.775 }
        }
    },
    tags: ['corrodes']
};
