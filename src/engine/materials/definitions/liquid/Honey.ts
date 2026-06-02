import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Honey: MaterialDefinition = {
    id: MaterialIds.honey,
    name: 'honey',
    colors: [
        { r: 212, g: 168, b: 58, a: 0.9 },
        { r: 232, g: 188, b: 80, a: 0.9 },
        { r: 192, g: 148, b: 44, a: 0.9 },
        { r: 222, g: 178, b: 68, a: 0.9 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.2,
            viscosity: 0.85,
            turbulence: 0.02
        }
    },
    physics: {
        density: 0.65,
        durability: 0,
        temperature: {
            specificHeat: 3.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
