import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

export const Desertum: BiomeDefinition = {
    id: BiomeIds.desertum,
    name: 'desertum',
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
                name: 'sand',
                occupancy: 'dynamic',
                weight: 1
            }, depth: { min: 64, max: 128 }
        },
        {
            material: {
                name: 'sandstone',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -Infinity, max: 64 }
        }
    ]
};
