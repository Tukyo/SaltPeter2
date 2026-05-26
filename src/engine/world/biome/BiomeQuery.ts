import type { Vec2 } from '../../definitions/Primitives';
import type { BiomeDefinition } from './definitions/BiomeModel';
import type { BiomeName } from './definitions/BiomeIdentity';
import type { WorldChunk } from '../WorldMap';

import { BiomeRegistry } from './BiomeRegistry';
import { ChunkData } from '../chunk/ChunkData';
import { WorldMap } from '../WorldMap';

// @omitfromdocs
export interface BiomeDisplay {
    label: string;
    color: string;
}

export interface BiomeLookup {
    biome: BiomeDefinition;
    entry: WorldChunk;
}

/**
 * Spatial lookup helpers for biome data.
 * Resolves world-space positions to biome definitions via the {@link WorldMap} chunk table.
 */
export class BiomeQuery {
    private static readonly display: Record<BiomeName, BiomeDisplay> = {
        natura: { label: 'Natura', color: '#81c784' },
        antra: { label: 'Antra', color: '#78909c' },
        finitor: { label: 'Finitor', color: '#ffffff' },
        nivalis: { label: "Nivalis", color: '#87dee6' },
        desertum: { label: "Desertum", color: '#fff45d' },
        glacialis: { label: "Glacialis", color: '#5482e6' },
        arenosus: { label: "Arenosus", color: '#e0b31c' }
    };

    // TODO: Remove this, you will not need a fallback
    private static readonly fallbackEntry: WorldChunk = {
        biome: 'finitor',
        from: { cx: 0, cy: 0 },
        to: { cx: 0, cy: 0 }
    };

    /** Returns the display label and color for a biome — used by UI panels. @internal */
    public static GetDisplay(name: BiomeName): BiomeDisplay { return BiomeQuery.display[name]; }

    /** Converts a world-space position to a chunk address and returns the matching biome and WorldChunk entry. */
    public static FindByWorldPos(pos: Vec2): BiomeLookup {
        const chunkSize = ChunkData.GetChunkSize();
        const cx = Math.floor(pos.x / chunkSize);
        const cy = Math.floor(pos.y / chunkSize);

        for (const entry of WorldMap.GetMap()) {
            if (cx >= entry.from.cx && cx < entry.to.cx &&
                cy >= entry.from.cy && cy < entry.to.cy) {
                return { biome: BiomeRegistry.Biomes[entry.biome], entry };
            }
        }

        return { biome: BiomeRegistry.Biomes.finitor, entry: BiomeQuery.fallbackEntry };
    }
}
