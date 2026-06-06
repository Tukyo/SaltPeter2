import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenCopper: MaterialDefinition = {
    id: MaterialIds.copper_molten,
    name: 'copper_molten',
    colors: [
        { r: 238, g: 172, b: 145, a: 1 },
        { r: 255, g: 232, b: 215, a: 1 },
        { r: 222, g: 155, b: 128, a: 1 },
        { r: 252, g: 212, b: 188, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.0,
            flow: 0.45,
            viscosity: 0.40,
            turbulence: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.03,
            restitution: 0.15,
            hardness: 0,
        },
        density: 0.92,
        durability: 0,
        temperature: {
            specificHeat: 5,
            restingTemperature: 0.90,
            restingStrength: 0.75
        }
    },
    transitions: {
        freezes: {
            to: 'copper',
            condition: { temperature: 0.77 }
        }
    },
    tags: ['corrodes', 'molten']
};
