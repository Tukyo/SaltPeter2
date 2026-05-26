import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Concrete: MaterialDefinition = {
    id: MaterialIds.concrete,
    name: 'concrete',
    colors: [
        { r: 125, g: 125, b: 125, a: 1 },
        { r: 138, g: 138, b: 138, a: 1 },
        { r: 110, g: 110, b: 110, a: 1 },
        { r: 132, g: 132, b: 132, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.7,
            cohesion: 0.9
        }
    },
    physics: {
        density: 5,
        durability: 6,
        temperature: {
            specificHeat: 1.1,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    },
    tags: ['corrodes']
};
