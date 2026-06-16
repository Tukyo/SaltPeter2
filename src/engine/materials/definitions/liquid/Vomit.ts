import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Vomit: MaterialDefinition = {
    id: MaterialIds.vomit,
    name: 'vomit',
    colors: [
        { r: 72, g: 88, b: 35, a: 0.925 },
        { r: 205, g: 88, b: 42, a: 0.925 },
        { r: 128, g: 148, b: 48, a: 0.925 },
        { r: 98, g: 118, b: 58, a: 0.925 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.38,
            viscosity: 0.45,
            turbulence: 0.06
        }
    },
    physics: {
        contact: {
            friction: 0.12,
            restitution: 0.03,
            hardness: 0,
        },
        density: 0.88,
        durability: 0,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes', 'rots_meat', 'organic']
};
