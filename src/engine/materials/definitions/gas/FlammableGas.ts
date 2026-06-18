import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const FlammableGas: MaterialDefinition = {
    id: MaterialIds.flammable_gas,
    name: 'flammable_gas',
    colors: [
        { r: 51, g: 199, b: 38, a: 0.35 },
        { r: 64, g: 217, b: 51, a: 0.32 },
        { r: 38, g: 179, b: 26, a: 0.38 },
        { r: 77, g: 230, b: 64, a: 0.30 },
    ],
    state: {
        health: 100,
        lifetime: 25
    },
    phase: 'gas',
    phaseBehavior: {
        gas: {
            activity: 12,
            rise: 5.75,
            dissipation: 0.05,
            turbulence: 0.0075,
        }
    },
    physics: {
        contact: {
            friction: 0,
            restitution: 0,
            hardness: 0,
        },
        density: 0.04,
        durability: 0.01,
        flammability: 0.95,
        temperature: {
            specificHeat: 0.7,
            restingTemperature: 0.6,
            restingStrength: 0.3
        }
    },
    tags: ['burns'],
};
