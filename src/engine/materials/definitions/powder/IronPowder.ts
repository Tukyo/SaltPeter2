import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const IronPowder: MaterialDefinition = {
    id: MaterialIds.iron_powder,
    name: 'iron_powder',
    colors: [
        { r: 95, g: 98, b: 106, a: 1 },
        { r: 175, g: 178, b: 185, a: 1 },
        { r: 108, g: 112, b: 120, a: 1 },
        { r: 145, g: 148, b: 156, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.5,
            mobility: 0.05,
            flow: 0.018,
            cohesion: 0.012
        }
    },
    physics: {
        contact: {
            friction: 0.35,
            restitution: 0.3,
            hardness: 0.15,
        },
        density: 1.8,
        durability: 1,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'iron_molten',
            condition: { temperature: 0.8 }
        }
    },
    tags: ['corrodes', 'rustable', 'metal']
};
