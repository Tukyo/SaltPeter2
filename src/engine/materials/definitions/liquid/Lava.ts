import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Lava: MaterialDefinition = {
    id: MaterialIds.lava,
    name: 'lava',
    colors: [
        { r: 230, g: 89, b: 13, a: 1 },
        { r: 242, g: 115, b: 20, a: 1 },
        { r: 179, g: 51, b: 5, a: 1 },
        { r: 255, g: 140, b: 31, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.0,
            flow: 0.475,
            viscosity: 0.65,
            turbulence: 0.1
        }
    },
    physics: {
        contact: {
            friction: 0.15,
            restitution: 0.05,
            hardness: 0,
        },
        density: 0.75,
        durability: 1,
        temperature: {
            specificHeat: 10,
            restingTemperature: 1.0,
            restingStrength: 0.8
        }
    },
    transitions: {
        freezes: {
            to: 'basalt',
            condition: { temperature: 0.725 }
        }
    },
};
