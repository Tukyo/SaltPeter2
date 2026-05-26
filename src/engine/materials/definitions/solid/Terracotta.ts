import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Terracotta: MaterialDefinition = {
    id: MaterialIds.terracotta,
    name: 'terracotta',
    colors: [
        { r: 185, g: 100, b: 58, a: 1 },
        { r: 198, g: 112, b: 68, a: 1 },
        { r: 170, g: 88,  b: 50, a: 1 },
        { r: 160, g: 80,  b: 44, a: 1 },
    ],
    state: {
        health: 220,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.3,
            cohesion: 0.95
        }
    },
    physics: {
        density: 5.5,
        durability: 7,
        temperature: {
            specificHeat: 0.8,
            restingTemperature: 0.6,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
