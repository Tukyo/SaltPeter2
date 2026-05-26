import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenSilver: MaterialDefinition = {
    id: MaterialIds.silver_molten,
    name: 'silver_molten',
    colors: [
        { r: 225, g: 223, b: 218, a: 1 },
        { r: 255, g: 255, b: 253, a: 1 },
        { r: 242, g: 240, b: 236, a: 1 },
        { r: 253, g: 252, b: 249, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.0,
            flow: 0.5,
            viscosity: 0.35,
            turbulence: 0.05
        }
    },
    physics: {
        density: 0.98,
        durability: 0,
        temperature: {
            specificHeat: 5,
            restingTemperature: 0.88,
            restingStrength: 0.4
        }
    },
    transitions: {
        freezes: {
            to: 'silver',
            condition: { temperature: 0.73 }
        }
    },
    tags: ['corrodes']
};
