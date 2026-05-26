import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Snow: MaterialDefinition = {
    id: MaterialIds.snow,
    name: 'snow',
    colors: [
        { r: 235, g: 245, b: 255, a: 1 },
        { r: 245, g: 250, b: 255, a: 1 },
        { r: 224, g: 237, b: 250, a: 1 },
        { r: 209, g: 230, b: 247, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.08,
            flow: 0.06,
            cohesion: 0.0
        }
    },
    physics: {
        density: 1.25,
        durability: 0.5,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.2,
            restingStrength: 0.5
        }
    },
    transitions: {
        melts: {
            to: 'water',
            condition: { temperature: 0.425 },
        }
    },
    tags: ['corrodes']
};
