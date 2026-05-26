import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Grass: MaterialDefinition = {
    id: MaterialIds.grass,
    name: 'grass',
    colors: [
        { r: 52, g: 82, b: 18, a: 1 },
        { r: 88, g: 122, b: 32, a: 1 },
        { r: 68, g: 100, b: 24, a: 1 },
        { r: 78, g: 112, b: 28, a: 1 },
    ],
    state: {
        health: 60,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 4.0,
            mobility: 0.03,
            flow: 0.01,
            cohesion: 0.12
        }
    },
    physics: {
        density: 1.8,
        durability: 1.125,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
