import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const SilverPowder: MaterialDefinition = {
    id: MaterialIds.silver_powder,
    name: 'silver_powder',
    colors: [
        { r: 118, g: 118, b: 122, a: 1 },
        { r: 228, g: 228, b: 230, a: 1 },
        { r: 158, g: 158, b: 162, a: 1 },
        { r: 195, g: 195, b: 198, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.06,
            flow: 0.025,
            cohesion: 0.01
        }
    },
    physics: {
        contact: {
            friction: 0.28,
            restitution: 0.35,
            hardness: 0.15,
        },
        density: 2.5,
        durability: 0,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'silver_molten',
            condition: { temperature: 0.765 }
        }
    },
    tags: ['corrodes']
};
