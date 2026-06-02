import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Acid: MaterialDefinition = {
    id: MaterialIds.acid,
    name: 'acid',
    colors: [
        { r: 51, g: 199, b: 38, a: 0.75 },
        { r: 64, g: 217, b: 51, a: 0.75 },
        { r: 38, g: 179, b: 26, a: 0.75 },
        { r: 77, g: 230, b: 64, a: 0.75 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 5.5,
            flow: 0.9,
            viscosity: 0.04,
            turbulence: 0.3
        }
    },
    physics: {
        density: 0.65,
        durability: 0.5,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    }
};
