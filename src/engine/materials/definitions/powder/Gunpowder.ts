import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Gunpowder: MaterialDefinition = {
    id: MaterialIds.gunpowder,
    name: 'gunpowder',
    colors: [
        { r: 56, g: 54, b: 51, a: 1 },
        { r: 66, g: 64, b: 61, a: 1 },
        { r: 46, g: 43, b: 41, a: 1 },
        { r: 77, g: 74, b: 71, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.5,
            mobility: 0.06,
            flow: 0.025,
            cohesion: 0.0
        }
    },
    physics: {
        density: 1.6,
        durability: 1.15,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
