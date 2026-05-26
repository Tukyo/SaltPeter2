import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Saltwater: MaterialDefinition = {
    id: MaterialIds.saltwater,
    name: 'saltwater',
    colors: [
        { r: 55, g: 138, b: 178, a: 1 },
        { r: 46, g: 150, b: 192, a: 1 },
        { r: 40, g: 124, b: 162, a: 1 },
        { r: 62, g: 144, b: 185, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 5.0,
            flow: 0.95,
            viscosity: 0.04,
            turbulence: 0.3
        }
    },
    physics: {
        density: 0.55,
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
            condition: { temperature: 0.31 }
        },
        boils: {
            to: 'steam',
            condition: { temperature: 0.61 }
        }
    },
};
