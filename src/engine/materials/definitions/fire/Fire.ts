import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Fire: MaterialDefinition = {
    id: MaterialIds.fire,
    name: 'fire',
    colors: [
        { r: 255, g: 160, b: 20, a: 0.9 },
        { r: 240, g: 90, b: 10, a: 0.85 },
        { r: 255, g: 220, b: 50, a: 0.8 },
        { r: 230, g: 55, b: 10, a: 0.9 },
    ],
    state: {
        health: 100,
        lifetime: 60,
    },
    phase: 'fire',
    phaseBehavior: {
        fire: {
            activity: 3,
            mobility: 0.05,
            dissipation: 80.0,
        }
    },
    physics: {
        density: 0.1,
        durability: 0,
        temperature: {
            specificHeat: 0.2,
            restingTemperature: 0.9,
            restingStrength: 0.8,
        }
    },
};
