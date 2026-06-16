import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Copper: MaterialDefinition = {
    id: MaterialIds.copper,
    name: 'copper',
    colors: [
        { r: 112, g: 54, b: 48, a: 1 },
        { r: 215, g: 122, b: 104, a: 1 },
        { r: 148, g: 74, b: 64, a: 1 },
        { r: 180, g: 98, b: 84, a: 1 },
    ],
    state: {
        health: 200,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.4,
            cohesion: 0.94
        }
    },
    physics: {
        contact: {
            friction: 0.35,
            restitution: 0.5,
            hardness: 0.8,
        },
        density: 5,
        durability: 5,
        temperature: {
            specificHeat: 3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'copper_molten',
            condition: { temperature: 0.795 }
        }
    },
    tags: ['corrodes', 'metal', 'ore']
};
