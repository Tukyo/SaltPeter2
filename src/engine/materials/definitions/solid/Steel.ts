import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Steel: MaterialDefinition = {
    id: MaterialIds.steel,
    name: 'steel',
    colors: [
        { r: 52, g: 62, b: 75, a: 1 },
        { r: 175, g: 188, b: 200, a: 1 },
        { r: 88, g: 100, b: 115, a: 1 },
        { r: 128, g: 142, b: 158, a: 1 },
    ],
    state: {
        health: 350,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.98
        }
    },
    physics: {
        density: 9,
        durability: 12,
        temperature: {
            specificHeat: 4,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'steel_molten',
            condition: { temperature: 0.825 }
        }
    },
    tags: ['corrodes', 'rustable']
};
