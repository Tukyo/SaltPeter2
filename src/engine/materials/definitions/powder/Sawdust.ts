import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Sawdust: MaterialDefinition = {
    id: MaterialIds.sawdust,
    name: 'sawdust',
    colors: [
        { r: 175, g: 148, b: 95, a: 1 },
        { r: 195, g: 165, b: 108, a: 1 },
        { r: 148, g: 122, b: 75, a: 1 },
        { r: 162, g: 138, b: 88, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.06,
            flow: 0.028,
            cohesion: 0.005
        }
    },
    physics: {
        contact: {
            friction: 0.65,
            restitution: 0.1,
            hardness: 0.08,
        },
        density: 1.5,
        durability: 1.05,
        flammability: 0.85,
        temperature: {
            specificHeat: 0.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
