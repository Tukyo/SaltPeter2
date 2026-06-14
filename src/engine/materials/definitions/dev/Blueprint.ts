import type { MaterialDefinition } from '../MaterialModel';
import { MaterialIds } from '../Materials';
import type { MaterialVariant } from '../MaterialVariants';

const BlueprintVariantIds = {
    powder: 1,
    liquid: 2,
    gas: 3,
    detail: 4,
    edge_00: 5,
    edge_01: 6,
    edge_02: 7,
    edge_03: 8,
} as const;

export type BlueprintVariantName = keyof typeof BlueprintVariantIds;
type BlueprintVariantId = (typeof BlueprintVariantIds)[BlueprintVariantName];

interface BlueprintVariant extends MaterialVariant {
    name: BlueprintVariantName;
    id: BlueprintVariantId;
}

export const BlueprintVariants: readonly BlueprintVariant[] = [
    {
        id: 1,
        name: 'powder',
        colors: [
            { r: 145, g: 138, b: 128, a: 1 },
            { r: 155, g: 148, b: 138, a: 1 },
            { r: 133, g: 127, b: 118, a: 1 },
            { r: 125, g: 120, b: 112, a: 1 },
        ],
    },
    {
        id: 2,
        name: 'liquid',
        colors: [
            { r: 108, g: 115, b: 132, a: 1 },
            { r: 118, g: 125, b: 142, a: 1 },
            { r: 97, g: 104, b: 120, a: 1 },
            { r: 88, g: 95, b: 110, a: 1 },
        ],
    },
    {
        id: 3,
        name: 'gas',
        colors: [
            { r: 120, g: 135, b: 115, a: 1 },
            { r: 130, g: 145, b: 125, a: 1 },
            { r: 108, g: 122, b: 103, a: 1 },
            { r: 98, g: 112, b: 94, a: 1 },
        ],
    },
    {
        id: 4,
        name: 'detail',
        colors: [
            { r: 162, g: 130, b: 105, a: 1 },
            { r: 172, g: 140, b: 115, a: 1 },
            { r: 150, g: 118, b: 95, a: 1 },
            { r: 140, g: 110, b: 88, a: 1 },
        ],
    },
    {
        id: 5,
        name: 'edge_00',
        colors: [
            { r: 20, g: 60, b: 255, a: 1 },
            { r: 20, g: 60, b: 255, a: 1 },
            { r: 20, g: 60, b: 255, a: 1 },
            { r: 20, g: 60, b: 255, a: 1 },
        ],
    },
    {
        id: 6,
        name: 'edge_01',
        colors: [
            { r: 20, g: 210, b: 40, a: 1 },
            { r: 20, g: 210, b: 40, a: 1 },
            { r: 20, g: 210, b: 40, a: 1 },
            { r: 20, g: 210, b: 40, a: 1 },
        ],
    },
    {
        id: 7,
        name: 'edge_02',
        colors: [
            { r: 150, g: 20, b: 230, a: 1 },
            { r: 150, g: 20, b: 230, a: 1 },
            { r: 150, g: 20, b: 230, a: 1 },
            { r: 150, g: 20, b: 230, a: 1 },
        ],
    },
    {
        id: 8,
        name: 'edge_03',
        colors: [
            { r: 240, g: 20, b: 20, a: 1 },
            { r: 240, g: 20, b: 20, a: 1 },
            { r: 240, g: 20, b: 20, a: 1 },
            { r: 240, g: 20, b: 20, a: 1 },
        ],
    },
];

export const Blueprint: MaterialDefinition = {
    id: MaterialIds.blueprint,
    name: 'blueprint',
    colors: [
        { r: 160, g: 160, b: 160, a: 1 },
        { r: 172, g: 171, b: 173, a: 1 },
        { r: 148, g: 149, b: 151, a: 1 },
        { r: 138, g: 140, b: 144, a: 1 },
    ],
    variants: BlueprintVariants,
    state: {
        health: 0,
    },
    phase: 'gas',
    phaseBehavior: {
        gas: { // No phase behaviors
            activity: 0,
            rise: 0,
            dissipation: 0,
            turbulence: 0
        }
    },
    physics: { // No physics
        contact: {
            friction: 0,
            restitution: 0,
            hardness: 0,
        },
        density: 0,
        durability: 0,
        temperature: {
            specificHeat: 1,
            restingTemperature: 0,
            restingStrength: 0
        }
    },
    tags: ['dev']
};
