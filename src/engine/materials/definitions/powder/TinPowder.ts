import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const TinPowder: MaterialDefinition = {
    id: MaterialIds.tin_powder,
    name: 'tin_powder',
    colors: [
        { r: 100, g: 108, b: 96, a: 1 },
        { r: 228, g: 235, b: 224, a: 1 },
        { r: 155, g: 163, b: 150, a: 1 },
        { r: 192, g: 200, b: 188, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 0.8,
            mobility: 0.7,
            flow: 0.6,
            cohesion: 0.3
        }
    },
    physics: {
        contact: {
            friction: 0.28,
            restitution: 0.3,
            hardness: 0.15,
        },
        density: 2.2,
        durability: 0,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'tin_molten',
            condition: { temperature: 0.6 }
        }
    },
    tags: ['corrodes']
};
