import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Coffee: MaterialDefinition = {
    id: MaterialIds.coffee,
    name: 'coffee',
    colors: [
        { r: 115, g: 72, b: 40, a: 0.925 },
        { r: 128, g: 80, b: 46, a: 0.925 },
        { r: 108, g: 66, b: 36, a: 0.925 },
        { r: 122, g: 76, b: 43, a: 0.925 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.5,
            flow: 0.65,
            viscosity: 0.10,
            turbulence: 0.05,
        }
    },
    physics: {
        contact: {
            friction: 0.03,
            restitution: 0.08,
            hardness: 0,
        },
        density: 0.82,
        durability: 0,
        temperature: {
            specificHeat: 2.5,
            restingTemperature: 0.55,
            restingStrength: 0.4,
        }
    },
    tags: ['corrodes']
};
