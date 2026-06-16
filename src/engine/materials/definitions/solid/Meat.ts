import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Meat: MaterialDefinition = {
    id: MaterialIds.meat,
    name: 'meat',
    colors: [
        { r: 210, g: 62, b: 72, a: 1 },
        { r: 178, g: 120, b: 148, a: 1 },
        { r: 195, g: 45, b: 55, a: 1 },
        { r: 155, g: 85, b: 130, a: 1 },
    ],
    state: {
        health: 120,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.2,
            cohesion: 0.75
        }
    },
    physics: {
        contact: {
            friction: 0.65,
            restitution: 0.1,
            hardness: 0.2,
        },
        density: 3,
        durability: 2,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    },
    tags: ['corrodes', 'meat', 'organic']
};
