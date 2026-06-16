import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const MoltenLead: MaterialDefinition = {
    id: MaterialIds.lead_molten,
    name: 'lead_molten',
    colors: [
        { r: 95, g: 109, b: 163, a: 1 },
        { r: 188, g: 195, b: 235, a: 1 },
        { r: 153, g: 168, b: 226, a: 1 },
        { r: 216, g: 232, b: 255, a: 1 },
    ],
    state: {
        health: 100,
    },
    phase: 'liquid',
    phaseBehavior: {
        liquid: {
            activity: 3.0,
            flow: 0.55,
            viscosity: 0.30,
            turbulence: 0.05
        }
    },
    physics: {
        contact: {
            friction: 0.03,
            restitution: 0.12,
            hardness: 0,
        },
        density: 0.98,
        durability: 0,
        temperature: {
            specificHeat: 4,
            restingTemperature: 0.82,
            restingStrength: 0.8
        }
    },
    transitions: {
        freezes: {
            to: 'lead',
            condition: { temperature: 0.61 }
        }
    },
    tags: ['corrodes', 'molten', 'metal']
};
