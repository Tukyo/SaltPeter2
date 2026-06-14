import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';
import { NoiseType } from '../../../../utility/Noise';

export const Glacialis: BiomeDefinition = {
    id: BiomeIds.glacialis,
    name: 'glacialis',
    layers: [
        {
            material: {
                name: 'ice',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -64, max: Infinity }
        },
        {
            material: {
                name: 'permafrost',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -Infinity, max: -64 }
        },
    ],
    detail: {
        material: { name: 'ice', occupancy: 'static' },
        threshold: 0.1,
        noise: {
            type: NoiseType.Perlin,
            options: { octaves: 2, persistence: 0.5, scale: 18, amplitude: 2 }
        }
    }
};
