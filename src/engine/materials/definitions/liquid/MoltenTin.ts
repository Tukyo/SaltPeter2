import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenTin: MaterialDefinition = {
    id: MaterialIds.tin_molten,
    name: 'tin_molten',
    colors: [
        { r: 205, g: 218, b: 200, a: 1 },
        { r: 248, g: 255, b: 245, a: 1 },
        { r: 225, g: 235, b: 220, a: 1 },
        { r: 240, g: 250, b: 236, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.0,
            flow: 0.52,
            viscosity: 0.28,
            turbulence: 0.05
        }
    },
    physics: {
        density: 0.96,
        durability: 0,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.78,
            restingStrength: 0.4
        }
    },
    transitions: {
        freezes: {
            to: 'tin',
            condition: { temperature: 0.6 }
        }
    },
    tags: ['corrodes']
};
