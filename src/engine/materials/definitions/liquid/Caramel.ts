import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Caramel: MaterialDefinition = {
    id: MaterialIds.caramel,
    name: 'caramel',
    colors: [
        { r: 185, g: 110, b: 35, a: 0.95 },
        { r: 205, g: 130, b: 50, a: 0.95 },
        { r: 170, g: 98, b: 28, a: 0.95 },
        { r: 195, g: 120, b: 42, a: 0.95 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.0,
            flow: 0.15,
            viscosity: 0.92,
            turbulence: 0.01,
        }
    },
    physics: {
        contact: {
            friction: 0.35,
            restitution: 0.01,
            hardness: 0,
        },
        density: 0.68,
        durability: 0,
        temperature: {
            specificHeat: 3.0,
            restingTemperature: 0.6,
            restingStrength: 0.3,
        }
    },
    tags: ['corrodes']
};
