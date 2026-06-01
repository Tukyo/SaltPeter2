import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenIron: MaterialDefinition = {
    id: MaterialIds.iron_molten,
    name: 'iron_molten',
    colors: [
        { r: 200, g: 188, b: 185, a: 1 },
        { r: 252, g: 242, b: 238, a: 1 },
        { r: 168, g: 158, b: 155, a: 1 },
        { r: 255, g: 252, b: 248, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.8,
            flow: 0.38,
            viscosity: 0.55,
            turbulence: 0.06
        }
    },
    physics: {
        density: 0.97,
        durability: 0,
        temperature: {
            specificHeat: 6,
            restingTemperature: 0.92,
            restingStrength: 0.7
        }
    },
    transitions: {
        freezes: {
            to: 'iron',
            condition: { temperature: 0.78 }
        }
    },
    tags: ['corrodes', 'molten']
};
