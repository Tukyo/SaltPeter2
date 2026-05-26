import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

export const Arenosus: BiomeDefinition = {
    id: BiomeIds.arenosus,
    name: 'arenosus',
    layers: [
        {
            material: {
                name: 'sandstone',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -64, max: Infinity }
        },
        {
            material: {
                name: 'terracotta',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -Infinity, max: -64 }
        },
    ]
};
