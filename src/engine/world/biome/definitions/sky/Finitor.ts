import type { BiomeDefinition } from '../BiomeModel';

import { BiomeIds } from '../Biomes';

export const Finitor: BiomeDefinition = {
    id: BiomeIds.finitor,
    name: 'finitor',
    layers: [{
        material: {
            name: 'air',
            occupancy: 'unoccupied',
            weight: 1
        }, depth: { min: -Infinity, max: Infinity }
    }]
};
