import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Salt: MaterialDefinition = {
    id: MaterialIds.salt,
    name: 'salt',
    colors: [
        { r: 188, g: 195, b: 210, a: 1 },
        { r: 195, g: 210, b: 200, a: 1 },
        { r: 205, g: 190, b: 208, a: 1 },
        { r: 190, g: 205, b: 218, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.05,
            flow: 0.022,
            cohesion: 0.018
        }
    },
    physics: {
        density: 0.675,
        durability: 1,
        temperature: {
            specificHeat: 0.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
