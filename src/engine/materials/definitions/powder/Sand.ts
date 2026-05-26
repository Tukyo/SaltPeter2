import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Sand: MaterialDefinition = {
    id: MaterialIds.sand,
    name: 'sand',
    colors: [
        { r: 194, g: 179, b: 128, a: 1 },
        { r: 204, g: 184, b: 133, a: 1 },
        { r: 184, g: 168, b: 122, a: 1 },
        { r: 217, g: 191, b: 140, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.04,
            flow: 0.015,
            cohesion: 0.015
        }
    },
    physics: {
        density: 1.8,
        durability: 2,
        temperature: {
            specificHeat: 0.1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
