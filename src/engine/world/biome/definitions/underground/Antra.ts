import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

export const Antra: BiomeDefinition = {
    id: BiomeIds.antra,
    name: 'antra',
    layers: [
        {
            material: {
                name: 'dirt',
                occupancy: 'dynamic',
                weight: 1
            }, depth: { min: -64, max: Infinity }
        },
        {
            material: {
                name: 'stone',
                occupancy: 'static',
                weight: 1
            }, depth: { min: -Infinity, max: -64 }
        },
    ]
};
