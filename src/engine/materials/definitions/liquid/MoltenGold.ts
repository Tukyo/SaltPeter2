import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenGold: MaterialDefinition = {
    id: MaterialIds.gold_molten,
    name: 'gold_molten',
    colors: [
        { r: 255, g: 220, b: 100, a: 1 },
        { r: 255, g: 245, b: 180, a: 1 },
        { r: 248, g: 200, b: 80, a: 1 },
        { r: 255, g: 255, b: 210, a: 1 },
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
            friction: 0.02,
            restitution: 0.15,
            hardness: 0,
        },
        density: 1,
        durability: 0,
        temperature: {
            specificHeat: 5,
            restingTemperature: 0.90,
            restingStrength: 0.75
        }
    },
    transitions: {
        freezes: {
            to: 'gold',
            condition: { temperature: 0.76 }
        }
    },
    tags: ['corrodes', 'molten']
};
