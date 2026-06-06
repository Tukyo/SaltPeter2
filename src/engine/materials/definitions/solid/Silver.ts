import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Silver: MaterialDefinition = {
    id: MaterialIds.silver,
    name: 'silver',
    colors: [
        { r: 138, g: 136, b: 132, a: 1 },
        { r: 248, g: 246, b: 242, a: 1 },
        { r: 178, g: 176, b: 171, a: 1 },
        { r: 220, g: 218, b: 213, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.4,
            cohesion: 0.95
        }
    },
    physics: {
        contact: {
            friction: 0.3,
            restitution: 0.5,
            hardness: 0.75,
        },
        density: 5,
        durability: 6,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'silver_molten',
            condition: { temperature: 0.79 }
        }
    },
    tags: ['corrodes']
};
