import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Urine: MaterialDefinition = {
    id: MaterialIds.urine,
    name: 'urine',
    colors: [
        { r: 205, g: 192, b: 35, a: 0.725 },
        { r: 212, g: 200, b: 40, a: 0.725 },
        { r: 198, g: 185, b: 30, a: 0.725 },
        { r: 208, g: 196, b: 37, a: 0.725 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.0,
            flow: 0.6,
            viscosity: 0.15,
            turbulence: 0.04
        }
    },
    physics: {
        contact: {
            friction: 0.03,
            restitution: 0.08,
            hardness: 0,
        },
        density: 0.85,
        durability: 0,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes', 'rots_meat', 'extinguishes']
};
