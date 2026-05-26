import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

export const Natura: BiomeDefinition = {
    id: BiomeIds.natura,
    name: 'natura',
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
                name: 'soil',
                occupancy: 'dynamic',
                weight: 1
            }, depth: { min: 64, max: 128 }
        },
        {
            material: {
                name: 'dirt',
                occupancy: 'dynamic',
                weight: 1
            }, depth: { min: -Infinity, max: 64 }
        }
    ]
};
