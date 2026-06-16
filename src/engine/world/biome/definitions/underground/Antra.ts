import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';
import { NoiseType } from '../../../../utility/Noise';
import { ColorNoiseType } from '../../../../utility/ColorNoise';

export const Antra: BiomeDefinition = {
    id: BiomeIds.antra,
    name: 'antra',
    layers: [
        {
            material: {
                name: 'dirt',
                occupancy: 'static',
                weight: 1
            },
            depth: { min: -64, max: Infinity }
        },
        {
            material: {
                name: 'stone',
                occupancy: 'static',
                weight: 1
            },
            depth: { min: -Infinity, max: -64 },
            detail: {
                color: {
                    type: ColorNoiseType.Boxes,
                    weights: [0.82, 0.06, 0.06, 0.06],
                    scale: 1
                }
            }
        },
    ],
    stamps: {
        solid: { name: 'stone', occupancy: 'static' },
        powder: [
            { name: 'coal', occupancy: 'dynamic', weight: 6 },
            { name: 'gunpowder', occupancy: 'dynamic', weight: 3 },
            { name: 'saltpeter', occupancy: 'dynamic', weight: 1 }
        ],
        liquid: [
            { name: 'water', occupancy: 'dynamic', weight: 3 },
            { name: 'oil', occupancy: 'dynamic', weight: 1 }
        ],
        detail: { name: 'wood', occupancy: 'static' }
    },
    detail: {
        material: { name: 'dirt', occupancy: 'static' },
        threshold: 0.1,
        noise: {
            type: NoiseType.Perlin,
            options: { octaves: 24, persistence: 0.5, scale: 64, amplitude: 2 }
        }
    },
    ores: ['coal']
};
