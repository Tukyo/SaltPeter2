import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenBronze: MaterialDefinition = {
    id: MaterialIds.bronze_molten,
    name: 'bronze_molten',
    colors: [
        { r: 235, g: 148, b: 72, a: 1 },
        { r: 255, g: 198, b: 128, a: 1 },
        { r: 220, g: 132, b: 68, a: 1 },
        { r: 248, g: 228, b: 178, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.43,
            viscosity: 0.48,
            turbulence: 0.05,
        }
    },
    physics: {
        contact: {
            friction: 0.04,
            restitution: 0.12,
            hardness: 0,
        },
        density: 0.90,
        durability: 0,
        temperature: {
            specificHeat: 4.5,
            restingTemperature: 0.88,
            restingStrength: 0.75
        }
    },
    transitions: {
        freezes: {
            to: 'bronze',
            condition: { temperature: 0.7 }
        }
    },
    tags: ['corrodes', 'molten']
};
