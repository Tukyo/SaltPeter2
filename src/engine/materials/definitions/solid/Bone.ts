import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Bone: MaterialDefinition = {
    id: MaterialIds.bone,
    name: 'bone',
    colors: [
        { r: 240, g: 230, b: 194, a: 1 },
        { r: 227, g: 217, b: 179, a: 1 },
        { r: 250, g: 240, b: 209, a: 1 },
        { r: 219, g: 209, b: 171, a: 1 },
    ],
    state: {
        health: 150,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.4,
            cohesion: 0.88
        }
    },
    physics: {
        contact: {
            friction: 0.55,
            restitution: 0.3,
            hardness: 0.7,
        },
        density: 4,
        durability: 5,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
