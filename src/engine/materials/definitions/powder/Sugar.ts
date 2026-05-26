import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Sugar: MaterialDefinition = {
    id: MaterialIds.sugar,
    name: 'sugar',
    colors: [
        { r: 228, g: 224, b: 218, a: 1 },
        { r: 255, g: 254, b: 250, a: 1 },
        { r: 242, g: 240, b: 235, a: 1 },
        { r: 252, g: 250, b: 245, a: 1 },
    ],
    state: {
        health: 60,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.5,
            mobility: 0.07,
            flow: 0.03,
            cohesion: 0.005
        }
    },
    physics: {
        density: 1.5,
        durability: 0,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
