import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const AluminumPowder: MaterialDefinition = {
    id: MaterialIds.aluminum_powder,
    name: 'aluminum_powder',
    colors: [
        { r: 122, g: 133, b: 143, a: 1 },
        { r: 166, g: 176, b: 184, a: 1 },
        { r: 102, g: 112, b: 122, a: 1 },
        { r: 148, g: 158, b: 166, a: 1 },
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
            cohesion: 0.008
        }
    },
    physics: {
        contact: {
            friction: 0.3,
            restitution: 0.35,
            hardness: 0.15,
        },
        density: 1.6,
        durability: 1,
        flammability: 0.825,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'aluminum_molten',
            condition: { temperature: 0.765 }
        }
    },
    tags: ['corrodes', 'burns', 'metal']
};
