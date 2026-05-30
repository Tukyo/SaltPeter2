import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Iron: MaterialDefinition = {
    id: MaterialIds.iron,
    name: 'iron',
    colors: [
        { r: 88, g: 92, b: 100, a: 1 },
        { r: 205, g: 208, b: 215, a: 1 },
        { r: 112, g: 116, b: 124, a: 1 },
        { r: 168, g: 172, b: 180, a: 1 },
    ],
    state: {
        health: 220,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.45,
            cohesion: 0.95
        }
    },
    physics: {
        density: 5,
        durability: 8,
        temperature: {
            specificHeat: 3.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'iron_molten',
            condition: { temperature: 0.81 }
        }
    },
    tags: ['corrodes', 'rustable']
};
