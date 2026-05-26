import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenSteel: MaterialDefinition = {
    id: MaterialIds.steel_molten,
    name: 'steel_molten',
    colors: [
        { r: 148, g: 152, b: 118, a: 1 },
        { r: 245, g: 248, b: 225, a: 1 },
        { r: 198, g: 202, b: 165, a: 1 },
        { r: 225, g: 228, b: 195, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.35,
            viscosity: 0.60,
            turbulence: 0.04
        }
    },
    physics: {
        density: 0.97,
        durability: 0,
        temperature: {
            specificHeat: 5,
            restingTemperature: 0.95,
            restingStrength: 0.475
        }
    },
    transitions: {
        freezes: {
            to: 'steel',
            condition: { temperature: 0.785 }
        }
    },
    tags: ['corrodes']
};
