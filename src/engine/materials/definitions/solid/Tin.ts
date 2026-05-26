import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Tin: MaterialDefinition = {
    id: MaterialIds.tin,
    name: 'tin',
    colors: [
        { r: 90, g: 96, b: 88, a: 1 },
        { r: 210, g: 218, b: 208, a: 1 },
        { r: 138, g: 145, b: 134, a: 1 },
        { r: 172, g: 180, b: 168, a: 1 },
    ],
    state: {
        health: 180,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.4,
            cohesion: 0.93
        }
    },
    physics: {
        density: 6,
        durability: 4,
        temperature: {
            specificHeat: 3.25,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'tin_molten',
            condition: { temperature: 0.65 }
        }
    },
    tags: ['corrodes']
};
