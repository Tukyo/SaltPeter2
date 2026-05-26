import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const BronzePowder: MaterialDefinition = {
    id: MaterialIds.bronze_powder,
    name: 'bronze_powder',
    colors: [
        { r: 105, g: 56, b: 18, a: 1 },
        { r: 215, g: 172, b: 108, a: 1 },
        { r: 152, g: 88, b: 36, a: 1 },
        { r: 188, g: 126, b: 62, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 6.0,
            mobility: 0.06,
            flow: 0.025,
            cohesion: 0.008,
        }
    },
    physics: {
        density: 1.8,
        durability: 1,
        temperature: {
            specificHeat: 2.0,
            restingTemperature: 0.5,
            restingStrength: 0.5,
        }
    },
    transitions: {
        melts: {
            to: 'bronze_molten',
            condition: { temperature: 0.78 }
        }
    },
    tags: ['corrodes']
};
