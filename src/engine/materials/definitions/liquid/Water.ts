import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Water: MaterialDefinition = {
    id: MaterialIds.water,
    name: 'water',
    colors: [
        { r: 89, g: 133, b: 217, a: 1 },
        { r: 82, g: 143, b: 230, a: 1 },
        { r: 43, g: 128, b: 242, a: 1 },
        { r: 66, g: 122, b: 209, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 5.5,
            flow: 1.0,
            viscosity: 0.02,
            turbulence: 0.35
        }
    },
    physics: {
        density: 0.5,
        durability: 0.5,
        temperature: {
            specificHeat: 4,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        freezes: {
            to: 'ice',
            condition: { temperature: 0.325 },
        },
        boils: {
            to: 'steam',
            condition: { temperature: 0.8 }
        }
    },
    tags: ['rusts', 'extinguishes']
};
