import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const CopperPowder: MaterialDefinition = {
    id: MaterialIds.copper_powder,
    name: 'copper_powder',
    colors: [
        { r: 100, g: 44, b: 46, a: 1 },
        { r: 225, g: 198, b: 172, a: 1 },
        { r: 162, g: 82, b: 74, a: 1 },
        { r: 192, g: 128, b: 108, a: 1 },
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
            friction: 0.3,
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
            to: 'copper_molten',
            condition: { temperature: 0.7 }
        }
    },
    tags: ['corrodes', 'metal']
};
