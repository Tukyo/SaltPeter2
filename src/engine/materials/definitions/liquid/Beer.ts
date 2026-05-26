import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Beer: MaterialDefinition = {
    id: MaterialIds.beer,
    name: 'beer',
    colors: [
        { r: 108, g: 62, b: 22, a: 0.88 },
        { r: 113, g: 66, b: 25, a: 0.88 },
        { r: 103, g: 58, b: 19, a: 0.88 },
        { r: 110, g: 64, b: 23, a: 0.88 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.5,
            flow: 0.7,
            viscosity: 0.12,
            turbulence: 0.08,
        }
    },
    physics: {
        density: 0.8,
        durability: 0,
        temperature: {
            specificHeat: 2.2,
            restingTemperature: 0.5,
            restingStrength: 0.4,
        }
    },
    tags: ['corrodes']
};
