import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenAluminum: MaterialDefinition = {
    id: MaterialIds.aluminum_molten,
    name: 'aluminum_molten',
    colors: [
        { r: 165, g: 175, b: 185, a: 1 },
        { r: 242, g: 248, b: 252, a: 1 },
        { r: 198, g: 208, b: 218, a: 1 },
        { r: 225, g: 234, b: 240, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 2.5,
            flow: 0.4,
            viscosity: 0.45,
            turbulence: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.03,
            restitution: 0.15,
            hardness: 0,
        },
        density: 0.8,
        durability: 0,
        temperature: {
            specificHeat: 5,
            restingTemperature: 0.85,
            restingStrength: 0.75
        }
    },
    transitions: {
        freezes: {
            to: 'aluminum',
            condition: { temperature: 0.72 }
        }
    },
    tags: ['corrodes', 'molten']
};
