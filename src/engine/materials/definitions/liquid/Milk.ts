import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Milk: MaterialDefinition = {
    id: MaterialIds.milk,
    name: 'milk',
    colors: [
        { r: 252, g: 244, b: 228, a: 1 },
        { r: 255, g: 249, b: 236, a: 1 },
        { r: 246, g: 238, b: 222, a: 1 },
        { r: 250, g: 242, b: 226, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 4.0,
            flow: 0.65,
            viscosity: 0.12,
            turbulence: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.02,
            restitution: 0.08,
            hardness: 0,
        },
        density: 0.55,
        durability: 0,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        freezes: {
            to: 'milk_frozen',
            condition: { temperature: 0.325 }
        }
    },
    tags: ['corrodes', 'extinguishes', 'organic']
};
