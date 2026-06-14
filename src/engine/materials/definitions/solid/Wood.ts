import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Wood: MaterialDefinition = {
    id: MaterialIds.wood,
    name: 'wood',
    colors: [
        { r: 108, g: 72, b: 34, a: 1 },
        { r: 118, g: 78, b: 38, a: 1 },
        { r: 94, g: 64, b: 34, a: 1 },
        { r: 68, g: 44, b: 20, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.92
        }
    },
    physics: {
        contact: {
            friction: 0.7,
            restitution: 0.3,
            hardness: 0.55,
        },
        density: 4,
        durability: 1.75,
        flammability: 0.65,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
