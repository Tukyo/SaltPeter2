import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const PoisonGas: MaterialDefinition = {
    id: MaterialIds.poison_gas,
    name: 'poison_gas',
    colors: [
        { r: 148, g: 52, b: 190, a: 0.45 },
        { r: 154, g: 57, b: 196, a: 0.45 },
        { r: 142, g: 47, b: 184, a: 0.45 },
        { r: 151, g: 54, b: 193, a: 0.45 },
    ],
    state: {
        health: 100,
        lifetime: 30
    },
    phase: 'gas',
    phaseBehavior: {
        gas: {
            activity: 2.75,
            rise: 0.575,
            dissipation: 0.05,
            turbulence: 0.355,
        }
    },
    physics: {
        contact: {
            friction: 0,
            restitution: 0,
            hardness: 0,
        },
        density: 0.05,
        durability: 0,
        temperature: {
            specificHeat: 0.9,
            restingTemperature: 0.6,
            restingStrength: 0.455
        }
    },
    transitions: {
        condenses: {
            to: 'poison',
            condition: { temperature: 0.5 }
        }
    }
};
