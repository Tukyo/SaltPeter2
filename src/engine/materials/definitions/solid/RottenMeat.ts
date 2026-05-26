import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const RottenMeat: MaterialDefinition = {
    id: MaterialIds.meat_rotten,
    name: 'meat_rotten',
    colors: [
        { r: 192, g: 55, b: 68, a: 1 },
        { r: 118, g: 162, b: 68, a: 1 },
        { r: 148, g: 128, b: 158, a: 1 },
        { r: 162, g: 72, b: 88, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.60
        }
    },
    physics: {
        density: 3,
        durability: 0,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
