import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Sandstone: MaterialDefinition = {
    id: MaterialIds.sandstone,
    name: 'sandstone',
    colors: [
        { r: 138, g: 118, b: 78, a: 1 },
        { r: 188, g: 165, b: 112, a: 1 },
        { r: 158, g: 138, b: 92, a: 1 },
        { r: 175, g: 152, b: 102, a: 1 },
    ],
    state: {
        health: 180,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.5,
            cohesion: 0.90
        }
    },
    physics: {
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
