import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MilkPowder: MaterialDefinition = {
    id: MaterialIds.milk_powder,
    name: 'milk_powder',
    colors: [
        { r: 248, g: 238, b: 218, a: 1 },
        { r: 255, g: 248, b: 230, a: 1 },
        { r: 240, g: 230, b: 210, a: 1 },
        { r: 252, g: 242, b: 222, a: 1 },
    ],
    state: {
        health: 60,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5.0,
            mobility: 0.08,
            flow: 0.032,
            cohesion: 0.003
        }
    },
    physics: {
        contact: {
            friction: 0.2,
            restitution: 0.1,
            hardness: 0.05,
        },
        density: 1.4,
        durability: 0,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['corrodes']
};
