import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Clay: MaterialDefinition = {
    id: MaterialIds.clay,
    name: 'clay',
    colors: [
        { r: 122, g: 68, b: 44, a: 1 },
        { r: 158, g: 96, b: 62, a: 1 },
        { r: 140, g: 82, b: 52, a: 1 },
        { r: 132, g: 74, b: 48, a: 1 },
    ],
    state: {
        health: 140,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.4,
            cohesion: 0.88,
        }
    },
    physics: {
        density: 3.5,
        durability: 3,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.5,
        }
    },
    tags: ['corrodes']
};
