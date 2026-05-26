import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Diarrhea: MaterialDefinition = {
    id: MaterialIds.diarrhea,
    name: 'diarrhea',
    colors: [
        { r: 88, g: 58, b: 22, a: 0.8 },
        { r: 96, g: 64, b: 26, a: 0.8 },
        { r: 82, g: 54, b: 20, a: 0.8 },
        { r: 92, g: 61, b: 24, a: 0.8 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.8,
            flow: 0.42,
            viscosity: 0.40,
            turbulence: 0.05
        }
    },
    physics: {
        density: 0.9,
        durability: 0,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        condenses: {
            to: 'feces',
            condition: { temperature: 0.335 }
        }
    },
    tags: ['corrodes']
};
