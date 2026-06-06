import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Ash: MaterialDefinition = {
    id: MaterialIds.ash,
    name: 'ash',
    colors: [
        { r: 182, g: 182, b: 185, a: 1 },
        { r: 192, g: 192, b: 196, a: 1 },
        { r: 172, g: 172, b: 175, a: 1 },
        { r: 198, g: 198, b: 202, a: 1 },
    ],
    state: {
        health: 60,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 4.5,
            mobility: 0.08,
            flow: 0.04,
            cohesion: 0.002
        }
    },
    physics: {
        contact: {
            friction: 0.2,
            restitution: 0.1,
            hardness: 0.05,
        },
        density: 1.5,
        durability: 0,
        temperature: {
            specificHeat: 0.3,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
