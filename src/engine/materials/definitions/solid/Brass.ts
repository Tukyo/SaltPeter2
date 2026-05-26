import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Brass: MaterialDefinition = {
    id: MaterialIds.brass,
    name: 'brass',
    colors: [
        { r: 182, g: 102, b: 50, a: 1 },
        { r: 208, g: 152, b: 64, a: 1 },
        { r: 146, g: 74, b: 36, a: 1 },
        { r: 196, g: 128, b: 54, a: 1 },
    ],
    state: {
        health: 180,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.5,
            cohesion: 0.92
        }
    },
    physics: {
        density: 4,
        durability: 6,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'brass_molten',
            condition: { temperature: 0.795 }
        }
    },
    tags: ['corrodes']
};
