import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Steam: MaterialDefinition = {
    id: MaterialIds.steam,
    name: 'steam',
    colors: [
        { r: 224, g: 235, b: 242, a: 0.6 },
        { r: 235, g: 242, b: 247, a: 0.5 },
        { r: 217, g: 230, b: 237, a: 0.65 },
        { r: 230, g: 240, b: 245, a: 0.55 },
    ],
    state: {
        health: 100,
        lifetime: 15
    },
    phase: 'gas',
    phaseBehavior: {
        gas: {
            activity: 10,
            rise: 6,
            dissipation: 0.1,
            turbulence: 0.01,
        }
    },
    physics: {
        contact: {
            friction: 0,
            restitution: 0,
            hardness: 0,
        },
        density: 0.01,
        durability: 0,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.615,
            restingStrength: 0.5
        }
    },
    transitions: {
        condenses: {
            to: 'water',
            condition: { temperature: 0.5 }
        }
    },
};
