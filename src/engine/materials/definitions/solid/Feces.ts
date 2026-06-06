import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Feces: MaterialDefinition = {
    id: MaterialIds.feces,
    name: 'feces',
    colors: [
        { r: 43, g: 30, b: 19, a: 1 },
        { r: 64, g: 46, b: 23, a: 1 },
        { r: 47, g: 36, b: 19, a: 1 },
        { r: 69, g: 48, b: 34, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.6,
            cohesion: 0.72
        }
    },
    physics: {
        contact: {
            friction: 0.7,
            restitution: 0.05,
            hardness: 0.1,
        },
        density: 3,
        durability: 0,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.4,
            restingStrength: 0.75
        }
    },
    transitions: {
        melts: {
            to: 'diarrhea',
            condition: { temperature: 0.575 }
        }
    },
    tags: ['corrodes', 'rots_meat']
};
