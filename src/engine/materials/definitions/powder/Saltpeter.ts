import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Saltpeter: MaterialDefinition = {
    id: MaterialIds.saltpeter,
    name: 'saltpeter',
    colors: [
        { r: 181, g: 72, b: 68, a: 1 },
        { r: 222, g: 129, b: 92, a: 1 },
        { r: 154, g: 64, b: 64, a: 1 },
        { r: 126, g: 63, b: 68, a: 1 },
    ],
    state: {
        health: 80,
    },
    phase: 'powder',
    phaseBehavior: {
        powder: {
            activity: 5,
            mobility: 0.045,
            flow: 0.0225,
            cohesion: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.3,
            restitution: 0.175,
            hardness: 0.125,
        },
        density: 1.75,
        durability: 1.0,
        flammability: 0.95,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
    tags: ['burns', 'corrodes'],
};
