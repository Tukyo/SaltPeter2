import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const ConcretePowder: MaterialDefinition = {
    id: MaterialIds.concrete_powder,
    name: 'concrete_powder',
    colors: [
        { r: 175, g: 175, b: 175, a: 1 },
        { r: 152, g: 152, b: 152, a: 1 },
        { r: 135, g: 135, b: 135, a: 1 },
        { r: 162, g: 162, b: 162, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 4.5,
            mobility: 0.06,
            flow: 0.025,
            cohesion: 0.01
        }
    },
    physics: {
        contact: {
            friction: 0.4,
            restitution: 0.2,
            hardness: 0.2,
        },
        density: 1.8,
        durability: 0,
        temperature: {
            specificHeat: 1.1,
            restingTemperature: 0.5,
            restingStrength: 0.2
        }
    },
    tags: ['corrodes']
};
