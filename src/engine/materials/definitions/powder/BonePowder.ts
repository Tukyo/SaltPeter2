import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const BonePowder: MaterialDefinition = {
    id: MaterialIds.bone_powder,
    name: 'bone_powder',
    colors: [
        { r: 210, g: 200, b: 162, a: 1 },
        { r: 195, g: 185, b: 148, a: 1 },
        { r: 222, g: 212, b: 174, a: 1 },
        { r: 183, g: 173, b: 136, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.5,
            mobility: 0.05,
            flow: 0.02,
            cohesion: 0.012
        }
    },
    physics: {
        density: 1.5,
        durability: 0,
        temperature: {
            specificHeat: 0.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
