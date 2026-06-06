import type { MaterialDefinition } from '../MaterialModel';
import type { MaterialVariant } from '../MaterialVariants';
import { MaterialIds } from '../Materials';

const ClothVariantIds = {
    red: 1,
    blue: 2,
    green: 3,
    yellow: 4,
    black: 5,
} as const;

type ClothVariantName = keyof typeof ClothVariantIds;
type ClothVariantId = (typeof ClothVariantIds)[ClothVariantName];

interface ClothVariant extends MaterialVariant {
    name: ClothVariantName;
    id: ClothVariantId;
}

export const ClothVariants: readonly ClothVariant[] = [
    {
        id: 1,
        name: 'red',
        colors: [
            { r: 180, g: 40,  b: 40,  a: 1 },
            { r: 210, g: 55,  b: 55,  a: 1 },
            { r: 155, g: 28,  b: 28,  a: 1 },
            { r: 195, g: 48,  b: 48,  a: 1 },
        ],
    },
    {
        id: 2,
        name: 'blue',
        colors: [
            { r: 40,  g: 80,  b: 180, a: 1 },
            { r: 55,  g: 100, b: 210, a: 1 },
            { r: 28,  g: 60,  b: 155, a: 1 },
            { r: 48,  g: 90,  b: 195, a: 1 },
        ],
    },
    {
        id: 3,
        name: 'green',
        colors: [
            { r: 40,  g: 140, b: 60,  a: 1 },
            { r: 55,  g: 165, b: 75,  a: 1 },
            { r: 28,  g: 115, b: 45,  a: 1 },
            { r: 48,  g: 152, b: 68,  a: 1 },
        ],
    },
    {
        id: 4,
        name: 'yellow',
        colors: [
            { r: 210, g: 185, b: 40,  a: 1 },
            { r: 235, g: 210, b: 55,  a: 1 },
            { r: 185, g: 160, b: 28,  a: 1 },
            { r: 222, g: 198, b: 48,  a: 1 },
        ],
    },
    {
        id: 5,
        name: 'black',
        colors: [
            { r: 30,  g: 28,  b: 28,  a: 1 },
            { r: 45,  g: 42,  b: 42,  a: 1 },
            { r: 20,  g: 18,  b: 18,  a: 1 },
            { r: 38,  g: 35,  b: 35,  a: 1 },
        ],
    },
];

export const Cloth: MaterialDefinition = {
    id: MaterialIds.cloth,
    name: 'cloth',
    colors: [
        { r: 240, g: 235, b: 228, a: 1 },
        { r: 255, g: 252, b: 245, a: 1 },
        { r: 220, g: 215, b: 208, a: 1 },
        { r: 232, g: 228, b: 220, a: 1 },
    ],
    variants: ClothVariants,
    state: {
        health: 40,
    },
    phase: 'solid',
    phaseBehavior: {
        solid: {
            activity: 0.2,
            cohesion: 0.85,
        }
    },
    physics: {
        contact: {
            friction: 0.75,
            restitution: 0.15,
            hardness: 0.1,
        },
        density: 2,
        durability: 0.75,
        flammability: 0.725,
        temperature: {
            specificHeat: 1.5,
            restingTemperature: 0.5,
            restingStrength: 0.4,
        }
    },
    tags: ['burns', 'corrodes'],
};
