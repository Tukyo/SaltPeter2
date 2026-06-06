import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const CookedMeat: MaterialDefinition = {
    id: MaterialIds.meat_cooked,
    name: 'meat_cooked',
    colors: [
        { r: 162, g: 112, b: 80, a: 1 },
        { r: 195, g: 158, b: 118, a: 1 },
        { r: 138, g: 95, b: 95, a: 1 },
        { r: 175, g: 138, b: 100, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.2,
            cohesion: 0.78
        }
    },
    physics: {
        contact: {
            friction: 0.55,
            restitution: 0.15,
            hardness: 0.3,
        },
        density: 3,
        durability: 2,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    },
    tags: ['corrodes', 'meat']
};
