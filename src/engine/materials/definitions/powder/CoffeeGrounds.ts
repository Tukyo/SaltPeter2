import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const CoffeeGrounds: MaterialDefinition = {
    id: MaterialIds.coffee_grounds,
    name: 'coffee_grounds',
    colors: [
        { r: 55,  g: 34, b: 20, a: 1 },
        { r: 128, g: 86, b: 58, a: 1 },
        { r: 85,  g: 54, b: 34, a: 1 },
        { r: 108, g: 70, b: 46, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.07,
            flow: 0.035,
            cohesion: 0.004,
        }
    },
    physics: {
        density: 1.3,
        durability: 0,
        temperature: {
            specificHeat: 0.8,
            restingTemperature: 0.5,
            restingStrength: 0.5,
        }
    },
    tags: ['corrodes']
};
