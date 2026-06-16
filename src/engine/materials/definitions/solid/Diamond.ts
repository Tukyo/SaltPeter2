import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Diamond: MaterialDefinition = {
    id: MaterialIds.diamond,
    name: 'diamond',
    colors: [
        { r: 151, g: 235, b: 255, a: 1 },
        { r: 120, g: 183, b: 213, a: 1 },
        { r: 196, g: 255, b: 255, a: 1 },
        { r: 210, g: 250, b: 255, a: 1 },
    ],
    state: {
        health: 500,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.75,
            cohesion: 0.125
        }
    },
    physics: {
        contact: {
            friction: 0.2,
            restitution: 0.8,
            hardness: 1.0,
        },
        density: 8,
        durability: 20,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['ore']
};
