import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Oil: MaterialDefinition = {
    id: MaterialIds.oil,
    name: 'oil',
    colors: [
        { r: 115, g: 82, b: 20, a: 0.85 },
        { r: 128, g: 92, b: 26, a: 0.85 },
        { r: 102, g: 71, b: 15, a: 0.85 },
        { r: 140, g: 97, b: 31, a: 0.85 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 4.0,
            flow: 0.7,
            viscosity: 0.2,
            turbulence: 0.1
        }
    },
    physics: {
        density: 0.25,
        durability: 0.5,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
