import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Aluminum: MaterialDefinition = {
    id: MaterialIds.aluminum,
    name: 'aluminum',
    colors: [
        { r: 115, g: 128, b: 138, a: 1 },
        { r: 184, g: 194, b: 201, a: 1 },
        { r: 97, g: 110, b: 120, a: 1 },
        { r: 153, g: 166, b: 173, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.5,
            cohesion: 0.95
        }
    },
    physics: {
        contact: {
            friction: 0.35,
            restitution: 0.5,
            hardness: 0.85,
        },
        density: 4,
        durability: 6,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'aluminum_molten',
            condition: { temperature: 0.78 }
        }
    },
    tags: ['corrodes']
};
