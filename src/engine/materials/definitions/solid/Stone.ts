import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Stone: MaterialDefinition = {
    id: MaterialIds.stone,
    name: 'stone',
    colors: [
        { r: 138, g: 140, b: 148, a: 1 },
        { r: 120, g: 122, b: 130, a: 1 },
        { r: 158, g: 161, b: 168, a: 1 },
        { r: 102, g: 105, b: 112, a: 1 },
    ],
    state: {
        health: 250,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.65,
            cohesion: 0.925
        }
    },
    physics: {
        contact: {
            friction: 0.7,
            restitution: 0.35,
            hardness: 0.85,
        },
        density: 5,
        durability: 8,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
