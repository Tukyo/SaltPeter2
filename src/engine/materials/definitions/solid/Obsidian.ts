import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Obsidian: MaterialDefinition = {
    id: MaterialIds.obsidian,
    name: 'obsidian',
    colors: [
        { r: 28, g: 14, b: 38, a: 1 },
        { r: 38, g: 20, b: 52, a: 1 },
        { r: 20, g: 10, b: 30, a: 1 },
        { r: 48, g: 26, b: 64, a: 1 },
    ],
    state: {
        health: 500,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.6,
            cohesion: 0.98
        }
    },
    physics: {
        density: 5,
        durability: 14,
        temperature: {
            specificHeat: 1.1,
            restingTemperature: 0.5,
            restingStrength: 0.4
        }
    },
    transitions: {
        boils: {
            to: 'lava',
            condition: { temperature: 0.9 }
        }
    },
};
