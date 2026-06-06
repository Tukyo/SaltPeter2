import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Soil: MaterialDefinition = {
    id: MaterialIds.soil,
    name: 'soil',
    colors: [
        { r: 88, g: 58, b: 28, a: 1 },
        { r: 76, g: 50, b: 24, a: 1 },
        { r: 100, g: 66, b: 32, a: 1 },
        { r: 68, g: 45, b: 21, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 4.0,
            mobility: 0.02,
            flow: 0.006,
            cohesion: 0.15
        }
    },
    physics: {
        contact: {
            friction: 0.55,
            restitution: 0.15,
            hardness: 0.2,
        },
        density: 2.2,
        durability: 3,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
