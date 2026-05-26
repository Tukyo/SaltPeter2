import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Brine: MaterialDefinition = {
    id: MaterialIds.brine,
    name: 'brine',
    colors: [
        { r: 36, g: 118, b: 98, a: 1 },
        { r: 42, g: 126, b: 105, a: 1 },
        { r: 30, g: 110, b: 90, a: 1 },
        { r: 38, g: 122, b: 100, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 5.0,
            flow: 0.925,
            viscosity: 0.04,
            turbulence: 0.275,
        }
    },
    physics: {
        density: 0.565,
        durability: 0.5,
        temperature: {
            specificHeat: 3.8,
            restingTemperature: 0.5,
            restingStrength: 0.5,
        }
    },
    transitions: {
        boils: {
            to: 'steam',
            condition: { temperature: 0.62 }
        }
    }
};
