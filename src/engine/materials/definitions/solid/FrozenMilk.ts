import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const FrozenMilk: MaterialDefinition = {
    id: MaterialIds.milk_frozen,
    name: 'milk_frozen',
    colors: [
        { r: 255, g: 250, b: 238, a: 0.85 },
        { r: 255, g: 254, b: 246, a: 0.9 },
        { r: 255, g: 246, b: 230, a: 0.8 },
        { r: 255, g: 252, b: 242, a: 0.85 },
    ],
    state: {
        health: 120,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.525,
            cohesion: 0.7
        }
    },
    physics: {
        density: 3,
        durability: 1,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.2,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'milk',
            condition: { temperature: 0.435 }
        }
    },
    tags: ['corrodes']
};
