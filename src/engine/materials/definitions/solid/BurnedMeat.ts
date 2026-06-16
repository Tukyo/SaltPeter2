import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const BurnedMeat: MaterialDefinition = {
    id: MaterialIds.meat_burned,
    name: 'meat_burned',
    colors: [
        { r: 65, g: 40, b: 32, a: 1 },
        { r: 130, g: 104, b: 93, a: 1 },
        { r: 76, g: 50, b: 41, a: 1 },
        { r: 54, g: 33, b: 27, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.15,
            cohesion: 0.7
        }
    },
    physics: {
        contact: {
            friction: 0.5,
            restitution: 0.1,
            hardness: 0.2,
        },
        density: 3,
        durability: 1,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    },
    tags: ['corrodes', 'meat', 'organic']
};
