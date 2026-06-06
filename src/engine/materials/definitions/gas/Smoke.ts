import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Smoke: MaterialDefinition = {
    id: MaterialIds.smoke,
    name: 'smoke',
    colors: [
        { r: 88, g: 86, b: 84, a: 0.6 },
        { r: 108, g: 106, b: 104, a: 0.5 },
        { r: 72, g: 70, b: 68, a: 0.65 },
        { r: 98, g: 96, b: 94, a: 0.55 },
    ],
    state: {
        health: 100,
        lifetime: 20
    },
    phase: 'gas',
    phaseBehavior: {
        gas: {
            activity: 2.5,
            rise: 0.75,
            dissipation: 0.075,
            turbulence: 0.5,
        }
    },
    physics: {
        contact: {
            friction: 0,
            restitution: 0,
            hardness: 0,
        },
        density: 0.02,
        durability: 0,
        temperature: {
            specificHeat: 0.5,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    }
};
