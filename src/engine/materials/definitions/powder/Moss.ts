import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Moss: MaterialDefinition = {
    id: MaterialIds.moss,
    name: 'moss',
    colors: [
        { r: 72, g: 105, b: 38, a: 1 },
        { r: 88, g: 122, b: 48, a: 1 },
        { r: 55, g: 82, b: 28, a: 1 },
        { r: 42, g: 62, b: 20, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 3.0,
            mobility: 0.02,
            flow: 0.008,
            cohesion: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.75,
            restitution: 0.1,
            hardness: 0.1,
        },
        density: 1.1,
        durability: 1.2,
        flammability: 0.55,
        temperature: {
            specificHeat: 0.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
