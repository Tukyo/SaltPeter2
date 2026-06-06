import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Cement: MaterialDefinition = {
    id: MaterialIds.cement,
    name: 'cement',
    colors: [
        { r: 172, g: 172, b: 172, a: 1 },
        { r: 148, g: 148, b: 148, a: 1 },
        { r: 130, g: 130, b: 130, a: 1 },
        { r: 158, g: 158, b: 158, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.0,
            flow: 0.4,
            viscosity: 0.75,
            turbulence: 0.02
        }
    },
    physics: {
        contact: {
            friction: 0.2,
            restitution: 0.02,
            hardness: 0,
        },
        density: 0.65,
        durability: 0.5,
        temperature: {
            specificHeat: 1.2,
            restingTemperature: 0.5,
            restingStrength: 0.2
        }
    },
    tags: ['corrodes']
};
