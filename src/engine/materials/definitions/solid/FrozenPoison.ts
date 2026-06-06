import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';

export const FrozenPoison: MaterialDefinition = {
    id: MaterialIds.poison_frozen,
    name: 'poison_frozen',
    colors: [
        { r: 140, g: 98, b: 185, a: 0.8 },
        { r: 158, g: 115, b: 205, a: 0.8 },
        { r: 128, g: 85, b: 172, a: 0.8 },
        { r: 182, g: 131, b: 237, a: 0.7 },
    ],
    state: {
        health: 150,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.2,
            cohesion: 0.88
        }
    },
    physics: {
        contact: {
            friction: 0.15,
            restitution: 0.3,
            hardness: 0.6,
        },
        density: 3,
        durability: 2,
        temperature: {
            specificHeat: 2,
            restingTemperature: 0.25,
            restingStrength: 0.25
        }
    },
    transitions: {
        melts: {
            to: 'poison',
            condition: { temperature: 0.45 }
        }
    },
    tags: ['corrodes', 'frozen']
};
