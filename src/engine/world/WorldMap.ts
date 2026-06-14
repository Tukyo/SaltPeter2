import type { BiomeName } from './biome/definitions/BiomeIdentity';
import type { ChunkAddress } from './chunk/ChunkData';
import type { Size2D, Vec2 } from '../definitions/Primitives';
import type { StampErosionConfig } from './WorldGen';

import { NoiseType } from '../utility/Noise';

//@omitfromdocs
export interface WorldChunk {
    biome: BiomeName;
    from: ChunkAddress;
    to: ChunkAddress;
    stampRegion?: { from: ChunkAddress; to: ChunkAddress; erosion?: StampErosionConfig };
}

interface BiomeEntry {
    name: BiomeName;
    width: number;
    stamps?: BiomeStampRegion;
}

interface BiomeStampRegion {
    offset?: Vec2; // Offset applied to stamp region - defaults to {x:0, y:0}
    size?: Size2D; // Size of the stamp region - defaults to full biome extent
    padding?: number; // Padding around the stamp, shrinks all four sides equally (applied after offset/size)
    erosion?: StampErosionConfig;
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
                {
                    name: 'antra',
                    width: 50,
                    stamps: {
                        padding: 1,
                        erosion: {
                            depth: 12,
                            noise: {
                                type: NoiseType.Perlin,
                                options: { octaves: 3, scale: 20, amplitude: 2, persistence: 0.5 },
                                threshold: 1
                            }
                        }
                    }
                },
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
            let stampRegion: WorldChunk['stampRegion'];
            if (entry.stamps) {
                const s = entry.stamps;
                const ox = s.offset?.x ?? 0;
                const oy = s.offset?.y ?? 0;
                const w = s.size?.width ?? entry.width;
                const h = s.size?.height ?? (cyTo - cyFrom);
                const p = s.padding ?? 0;
                stampRegion = {
                    from: { cx: cx + ox + p, cy: cyFrom + oy + p },
                    to: { cx: cx + ox + w - p, cy: cyFrom + oy + h - p },
                    erosion: s.erosion,
                };
            }
            chunks.push({
                biome: entry.name,
                from: { cx, cy: cyFrom },
                to: { cx: cx + entry.width, cy: cyTo },
                stampRegion
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
    public static GetMap(): WorldChunk[] { return WorldMap.map; }
}
