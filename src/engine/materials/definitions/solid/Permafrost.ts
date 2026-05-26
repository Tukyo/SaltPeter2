import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Permafrost: MaterialDefinition = {
    id: MaterialIds.permafrost,
    name: 'permafrost',
    colors: [
        { r: 110, g: 158, b: 220, a: 1 },
        { r: 92,  g: 142, b: 210, a: 1 },
        { r: 128, g: 172, b: 228, a: 1 },
        { r: 80,  g: 130, b: 205, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.8
        }
    },
    physics: {
        density: 2.0,
        durability: 3,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.1,
            restingStrength: 0.7
        }
    },
    transitions: {
        melts: {
            to: 'water',
            condition: { temperature: 0.55 }
        }
    },
    tags: ['corrodes']
};
