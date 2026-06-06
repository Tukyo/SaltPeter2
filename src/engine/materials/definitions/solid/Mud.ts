import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Mud: MaterialDefinition = {
    id: MaterialIds.mud,
    name: 'mud',
    colors: [
        { r: 51, g: 41, b: 29, a: 1 },
        { r: 82, g: 67, b: 49, a: 1 },
        { r: 62, g: 50, b: 35, a: 1 },
        { r: 72, g: 59, b: 42, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.7,
            cohesion: 0.65
        }
    },
    physics: {
        contact: {
            friction: 0.72,
            restitution: 0.05,
            hardness: 0.1,
        },
        density: 4,
        durability: 0,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
