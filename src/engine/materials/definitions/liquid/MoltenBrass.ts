import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenBrass: MaterialDefinition = {
    id: MaterialIds.brass_molten,
    name: 'brass_molten',
    colors: [
        { r: 242, g: 168, b: 80, a: 1 },
        { r: 255, g: 210, b: 140, a: 1 },
        { r: 230, g: 148, b: 90, a: 1 },
        { r: 255, g: 240, b: 190, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.42,
            viscosity: 0.50,
            turbulence: 0.05
        }
    },
    physics: {
        density: 0.95,
        durability: 0,
        temperature: {
            specificHeat: 4,
            restingTemperature: 0.88,
            restingStrength: 0.75
        }
    },
    transitions: {
        freezes: {
            to: 'brass',
            condition: { temperature: 0.74 }
        }
    },
    tags: ['corrodes', 'molten']
};
