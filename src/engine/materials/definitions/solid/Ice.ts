import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Ice: MaterialDefinition = {
    id: MaterialIds.ice,
    name: 'ice',
    colors: [
        { r: 184, g: 224, b: 247, a: 1 },
        { r: 199, g: 235, b: 252, a: 1 },
        { r: 166, g: 212, b: 240, a: 1 },
        { r: 153, g: 204, b: 235, a: 1 },
    ],
    state: {
        health: 50,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.6,
            cohesion: 0.625
        }
    },
    physics: {
        density: 0.9,
        durability: 1.5,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.2,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'water',
            condition: { temperature: 0.45 }
        }
    },
    tags: ['corrodes']
};
