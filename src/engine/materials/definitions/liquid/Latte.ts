import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Latte: MaterialDefinition = {
    id: MaterialIds.latte,
    name: 'latte',
    colors: [
        { r: 165, g: 118, b: 82, a: 0.92 },
        { r: 178, g: 130, b: 92, a: 0.92 },
        { r: 155, g: 110, b: 74, a: 0.92 },
        { r: 172, g: 124, b: 88, a: 0.92 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.5,
            flow: 0.65,
            viscosity: 0.10,
            turbulence: 0.05,
        }
    },
    physics: {
        density: 0.82,
        durability: 0,
        temperature: {
            specificHeat: 2.5,
            restingTemperature: 0.55,
            restingStrength: 0.4,
        }
    },
    tags: ['corrodes']
};
