import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Wood: MaterialDefinition = {
    id: MaterialIds.wood,
    name: 'wood',
    colors: [
        { r: 55, g: 33, b: 14, a: 1 },
        { r: 128, g: 86, b: 42, a: 1 },
        { r: 82, g: 52, b: 22, a: 1 },
        { r: 105, g: 70, b: 33, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.92
        }
    },
    physics: {
        density: 4,
        durability: 1.75,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
