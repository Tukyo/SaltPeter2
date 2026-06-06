import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Gravel: MaterialDefinition = {
    id: MaterialIds.gravel,
    name: 'gravel',
    colors: [
        { r: 133, g: 128, b: 122, a: 1 },
        { r: 115, g: 110, b: 105, a: 1 },
        { r: 153, g: 148, b: 140, a: 1 },
        { r: 97, g: 92, b: 87, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 4.0,
            mobility: 0.03,
            flow: 0.008,
            cohesion: 0.125
        }
    },
    physics: {
        contact: {
            friction: 0.65,
            restitution: 0.45,
            hardness: 0.6,
        },
        density: 2.5,
        durability: 4,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
