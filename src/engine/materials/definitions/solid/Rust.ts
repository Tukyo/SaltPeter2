import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Rust: MaterialDefinition = {
    id: MaterialIds.rust,
    name: 'rust',
    colors: [
        { r: 180, g: 80, b: 22, a: 1 },
        { r: 196, g: 95, b: 30, a: 1 },
        { r: 163, g: 65, b: 15, a: 1 },
        { r: 210, g: 108, b: 40, a: 1 },
    ],
    state: {
        health: 120,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.6,
            cohesion: 0.7
        }
    },
    physics: {
        density: 4,
        durability: 2,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
