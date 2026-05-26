import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Lead: MaterialDefinition = {
    id: MaterialIds.lead,
    name: 'lead',
    colors: [
        { r: 72, g: 78, b: 112, a: 1 },
        { r: 138, g: 145, b: 188, a: 1 },
        { r: 94, g: 100, b: 138, a: 1 },
        { r: 115, g: 122, b: 162, a: 1 },
    ],
    state: {
        health: 220,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.4,
            cohesion: 0.94
        }
    },
    physics: {
        density: 7,
        durability: 3,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'lead_molten',
            condition: { temperature: 0.67 }
        }
    },
    tags: ['corrodes']
};
