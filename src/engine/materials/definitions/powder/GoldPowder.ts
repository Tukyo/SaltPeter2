import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const GoldPowder: MaterialDefinition = {
    id: MaterialIds.gold_powder,
    name: 'gold_powder',
    colors: [
        { r: 210, g: 155, b: 32, a: 1 },
        { r: 248, g: 218, b: 95, a: 1 },
        { r: 178, g: 120, b: 18, a: 1 },
        { r: 235, g: 192, b: 68, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.5,
            mobility: 0.05,
            flow: 0.02,
            cohesion: 0.01
        }
    },
    physics: {
        contact: {
            friction: 0.25,
            restitution: 0.35,
            hardness: 0.15,
        },
        density: 2.0,
        durability: 1,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'gold_molten',
            condition: { temperature: 0.79 }
        }
    },
    tags: ['corrodes', 'metal']
};
