import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const Plastic: MaterialDefinition = {
    id: MaterialIds.plastic,
    name: 'plastic',
    colors: [
        { r: 154, g: 157, b: 162, a: 1 },
        { r: 157, g: 160, b: 165, a: 1 },
        { r: 152, g: 155, b: 160, a: 1 },
        { r: 156, g: 159, b: 164, a: 1 },
    ],
    state: {
        health: 120,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.5,
            cohesion: 0.88
        }
    },
    physics: {
        contact: {
            friction: 0.4,
            restitution: 0.55,
            hardness: 0.65,
        },
        density: 3,
        durability: 3,
        flammability: 0.6,
        temperature: {
            specificHeat: 0.8,
            restingTemperature: 0.5,
            restingStrength: 0.3
        }
    },
    transitions: {
        melts: {
            to: 'plastic_molten',
            condition: { temperature: 0.785 }
        }
    },
    tags: ['burns', 'corrodes'],
};
