import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Gold: MaterialDefinition = {
    id: MaterialIds.gold,
    name: 'gold',
    colors: [
        { r: 210, g: 148, b: 35, a: 1 },
        { r: 245, g: 215, b: 85, a: 1 },
        { r: 188, g: 124, b: 28, a: 1 },
        { r: 255, g: 238, b: 130, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.45,
            cohesion: 0.96
        }
    },
    physics: {
        density: 5,
        durability: 4,
        temperature: {
            specificHeat: 4,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'gold_molten',
            condition: { temperature: 0.8 }
        }
    },
    tags: ['corrodes']
};
