import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Dirt: MaterialDefinition = {
    id: MaterialIds.dirt,
    name: 'dirt',
    colors: [
        { r: 105, g: 77, b: 48, a: 1 },
        { r: 92, g: 66, b: 43, a: 1 },
        { r: 122, g: 89, b: 56, a: 1 },
        { r: 77, g: 56, b: 36, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 4.0,
            mobility: 0.02,
            flow: 0.006,
            cohesion: 0.15
        }
    },
    physics: {
        density: 2.2,
        durability: 3,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
