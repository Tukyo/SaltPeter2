import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Peat: MaterialDefinition = {
    id: MaterialIds.peat,
    name: 'peat',
    colors: [
        { r: 28, g: 48, b: 20, a: 0.9 },
        { r: 42, g: 68, b: 30, a: 0.9 },
        { r: 18, g: 32, b: 12, a: 0.9 },
        { r: 55, g: 82, b: 38, a: 0.9 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.3,
            viscosity: 0.6,
            turbulence: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.18,
            restitution: 0.03,
            hardness: 0,
        },
        density: 0.475,
        durability: 0.5,
        flammability: 0.45,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    },
    tags: ['burns', 'corrodes'],
};
