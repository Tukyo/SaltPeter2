import type { BiomeName } from './biome/definitions/BiomeIdentity';
import type { ChunkAddress } from './chunk/ChunkData';

export interface WorldChunk {
    biome: BiomeName;
    from: ChunkAddress;
    to: ChunkAddress;
}

interface BiomeEntry {
    name: BiomeName;
    width: number;
}

interface WorldZone {
    height: number;
    originBiome: BiomeName;
    biomes: BiomeEntry[];
}

interface WorldLayout {
    sky: WorldZone;
    surface: WorldZone;
    underground: WorldZone;
}

/**
 * Authored world map — defines which biome occupies which region of chunk space.
 * 
 * Organized into named depth layers, each specifying an ordered sequence of biome columns with widths in chunks.
 * 
 * An originBiome per layer anchors it to cx 0; columns before it extend into negative cx, columns after into positive cx.
 * 
 * Compiles to a flat {@link WorldChunk} array at startup, indexed by {@link BiomeQuery}.
 */
export class WorldMap {
    private static readonly layout: WorldLayout = {
        sky: {
            height: 8,
            originBiome: 'finitor',
            biomes: [
                { name: 'finitor', width: 10 }
            ]
        },
        underground: {
            height: 10,
            originBiome: 'antra',
            biomes: [
                { name: 'glacialis', width: 80 },
                { name: 'antra', width: 50 },
                { name: 'arenosus', width: 100 }
            ]
        },
        surface: {
            height: 2,
            originBiome: 'natura',
            biomes: [
                { name: 'nivalis', width: 80 },
                { name: 'natura', width: 50 },
                { name: 'desertum', width: 100 }
            ]
        }
    };

    private static readonly map: WorldChunk[] = WorldMap.Build();

    private static BuildZone(zone: WorldZone, cyFrom: number, cyTo: number): WorldChunk[] {
        const chunks: WorldChunk[] = [];
        const originIndex = zone.biomes.findIndex(b => b.name === zone.originBiome);
        let cx = 0;
        for (let i = 0; i < originIndex; i++) cx -= zone.biomes[i].width;

        for (const entry of zone.biomes) {
            chunks.push({
                biome: entry.name,
                from: { cx, cy: cyFrom },
                to: { cx: cx + entry.width, cy: cyTo }
            });
            cx += entry.width;
        }
        return chunks;
    }

    private static Build(): WorldChunk[] {
        const { sky, surface, underground } = WorldMap.layout;
        return [
            ...WorldMap.BuildZone(surface, 0, surface.height),
            ...WorldMap.BuildZone(underground, -underground.height, 0),
            ...WorldMap.BuildZone(sky, surface.height, surface.height + sky.height),
        ];
    }

    /** Returns the flat array of world chunks derived from the layout definition. */
    public static GetMap(): WorldChunk[] {
        return WorldMap.map;
    }
}
