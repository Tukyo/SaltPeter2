import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

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
    ]
};
