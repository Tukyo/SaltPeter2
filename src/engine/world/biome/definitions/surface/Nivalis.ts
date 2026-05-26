import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

export const Nivalis: BiomeDefinition = {
    id: BiomeIds.nivalis,
    name: 'nivalis',
    layers: [
        {
            material: {
                name: 'air',
                occupancy: 'unoccupied',
                weight: 1
            }, depth: { min: 128, max: Infinity }
        },
        {
            material: {
                name: 'snow',
                occupancy: 'dynamic',
                weight: 1
            }, depth: { min: 64, max: 128 }
        },
        {
            material: {
                name: 'ice',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -Infinity, max: 64 }
        }
    ]
};
