import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenPlastic: MaterialDefinition = {
    id: MaterialIds.plastic_molten,
    name: 'plastic_molten',
    colors: [
        { r: 195, g: 190, b: 187, a: 0.95 },
        { r: 200, g: 195, b: 192, a: 0.95 },
        { r: 192, g: 187, b: 184, a: 0.95 },
        { r: 198, g: 193, b: 190, a: 0.95 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.0,
            flow: 0.28,
            viscosity: 0.72,
            turbulence: 0.04
        }
    },
    physics: {
        density: 0.5,
        durability: 0,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.875,
            restingStrength: 0.65
        }
    },
    transitions: {
        freezes: {
            to: 'plastic',
            condition: { temperature: 0.6 }
        }
    },
    tags: ['burns', 'corrodes', 'molten'],
};
