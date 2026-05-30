import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Blood: MaterialDefinition = {
    id: MaterialIds.blood,
    name: 'blood',
    colors: [
        { r: 158, g: 10, b: 10, a: 1 },
        { r: 140, g: 5, b: 5, a: 1 },
        { r: 179, g: 15, b: 15, a: 1 },
        { r: 122, g: 3, b: 8, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 4.5,
            flow: 0.85,
            viscosity: 0.08,
            turbulence: 0.25
        }
    },
    physics: {
        density: 0.52,
        durability: 0.5,
        temperature: {
            specificHeat: 3.8,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes', 'extinguishes']
};
