import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Blueprint: MaterialDefinition = {
    id: MaterialIds.blueprint,
    name: 'blueprint',
    colors: [
        { r: 160, g: 160, b: 160, a: 1 }, // Solid
        { r: 230, g: 210, b: 60, a: 1 }, // Powder
        { r: 60, g: 120, b: 220, a: 1 }, // Liquid
        { r: 0, g: 0, b: 0, a: 0 },
    ],
    state: {
        health: 0,
    },
    phase: 'gas',
    phaseBehavior: {
        gas: { // No phase behaviors
            activity: 0,
            rise: 0,
            dissipation: 0,
            turbulence: 0
        }
    },
    physics: { // No physics
        contact: {
            friction: 0,
            restitution: 0,
            hardness: 0,
        },
        density: 0,
        durability: 0,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0,
            restingStrength: 0
        }
    },
    tags: ['dev']
};
