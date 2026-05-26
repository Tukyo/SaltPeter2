import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Basalt: MaterialDefinition = {
    id: MaterialIds.basalt,
    name: 'basalt',
    colors: [
        { r: 92, g: 26, b: 20, a: 1 },
        { r: 112, g: 36, b: 26, a: 1 },
        { r: 56, g: 15, b: 13, a: 1 },
        { r: 77, g: 20, b: 15, a: 1 },
    ],
    state: {
        health: 500,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.5,
            cohesion: 0.95
        }
    },
    physics: {
        density: 4.5,
        durability: 6,
        temperature: {
            specificHeat: 1.25,
            restingTemperature: 0.525,
            restingStrength: 0.5
        }
    },
};
