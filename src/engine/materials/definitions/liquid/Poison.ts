import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Poison: MaterialDefinition = {
    id: MaterialIds.poison,
    name: 'poison',
    colors: [
        { r: 148, g: 52, b: 190, a: 0.75 },
        { r: 154, g: 57, b: 196, a: 0.75 },
        { r: 142, g: 47, b: 184, a: 0.75 },
        { r: 151, g: 54, b: 193, a: 0.75 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 4.0,
            flow: 0.75,
            viscosity: 0.08,
            turbulence: 0.1
        }
    },
    physics: {
        density: 0.7,
        durability: 0,
        temperature: {
            specificHeat: 3.5,
            restingTemperature: 0.5,
            restingStrength: 0.1
        }
    },
    transitions: {
        freezes: {
            to: 'poison_frozen',
            condition: { temperature: 0.375 }
        },
        melts: {
            to: 'poison_gas',
            condition: { temperature: 0.585 }
        }
    },
    tags: ['corrodes']
};
