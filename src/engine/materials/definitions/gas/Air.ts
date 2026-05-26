import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Air: MaterialDefinition = {
    id: MaterialIds.air,
    name: 'air',
    colors: [ // Air is invisible and not drawn to the canvas
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 0 },
    ],
    state: {
        health: 0, // Air cannot die
    },
    phase: 'gas',
    phaseBehavior: {
        gas: { // Air does not participate in phase events
            activity: 0,
            rise: 0,
            dissipation: 0,
            turbulence: 0
        }
    },
    physics: {
        density: 0,
        durability: 0,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0.5,
            restingStrength: 0.5
        }
    },
};
