import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Bronze: MaterialDefinition = {
    id: MaterialIds.bronze,
    name: 'bronze',
    colors: [
        { r: 112, g: 62, b: 24, a: 1 },
        { r: 195, g: 118, b: 52, a: 1 },
        { r: 140, g: 78, b: 32, a: 1 },
        { r: 168, g: 98, b: 44, a: 1 },
    ],
    state: {
        health: 190,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.45,
            cohesion: 0.93,
        }
    },
    physics: {
        contact: {
            friction: 0.35,
            restitution: 0.5,
            hardness: 0.82,
        },
        density: 4.5,
        durability: 6,
        temperature: {
            specificHeat: 3.0,
            restingTemperature: 0.5,
            restingStrength: 0.5,
        }
    },
    transitions: {
        melts: {
            to: 'bronze_molten',
            condition: { temperature: 0.825 }
        }
    },
    tags: ['corrodes']
};
