import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Coal: MaterialDefinition = {
    id: MaterialIds.coal,
    name: 'coal',
    colors: [
        { r: 22, g: 21, b: 25, a: 1 },
        { r: 44, g: 42, b: 48, a: 1 },
        { r: 30, g: 28, b: 33, a: 1 },
        { r: 36, g: 34, b: 40, a: 1 },
    ],
    state: {
        health: 180,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.88
        }
    },
    physics: {
        density: 5,
        durability: 4,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
