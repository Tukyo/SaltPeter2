import type { ChunkAddress, ChunkEntry, ChunkViews } from './chunk/ChunkData';

import { BiomeQuery } from './biome/BiomeQuery';
import { ChunkData } from './chunk/ChunkData';
import { LogManager } from '../debug/LogManager';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { Noise } from '../utility/Noise';
import { OccupancyIds } from '../materials/definitions/MaterialIdentity';
import { WorldConfig } from '../config/WorldConfig';

/**
 * Procedural chunk generator.
 * Given a chunk address and seed, runs one or more generation passes to fill
 * identity, physics, and state buffers from scratch.
 * The base pass queries {@link BiomeQuery} for the biome at each cell, applies
 * terrain and detail noise to shift layer boundaries, then writes the matching
 * material from the biome's layer definition.
 */
export class WorldGen {
    /** Generates a fresh chunk at the given address using the provided seed. Returns a fully populated ChunkEntry. @internal */
    public static Generate(address: ChunkAddress, seed: number): ChunkEntry {
        const identity = new ArrayBuffer(ChunkData.GetIdentityBytesPerChunk());
        const physics = new ArrayBuffer(ChunkData.GetPhysicsBytesPerChunk());
        const state = new ArrayBuffer(ChunkData.GetStateBytesPerChunk());
        const views: ChunkViews = {
            identity: new DataView(identity),
            physics: new DataView(physics),
            state: new DataView(state),
        };

        WorldGen.BasePass(address, seed, views);

        LogManager.Instance?.Log({
            text: `Generated chunk (${address.cx},${address.cy}).`,
            options: { tags: ['Chunk'], noisy: true }
        });

        return { address, identity, physics, state };
    }

    /** 
     * Places materials in each cell, based on biome layer definitions.
     * Uses a single global terrain noise to shift layer boundaries.
     */
    private static BasePass(address: ChunkAddress, seed: number, views: ChunkViews): void {
        const chunkSize = ChunkData.GetChunkSize();
        const { terrain, detail, blend } = WorldConfig.GetConfig().generation;
        const air = MaterialRegistry.Materials.air;

        for (let localY = 0; localY < chunkSize; localY++) {
            for (let localX = 0; localX < chunkSize; localX++) {
                const cellIndex = localY * chunkSize + localX;
                const worldX = address.cx * chunkSize + localX;
                const worldY = address.cy * chunkSize + localY;

                const blendX = Math.round(Noise.GetNoise({
                    noiseType: blend.noiseType,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: {
                        octaves: blend.octaves,
                        persistence: blend.persistence,
                        scale: blend.scale,
                        amplitude: blend.amplitude
                    }
                }));
                const blendY = Math.round(Noise.GetNoise({
                    noiseType: blend.noiseType,
                    coords: { x: worldX + 31337, y: worldY },
                    seed,
                    options: {
                        octaves: blend.octaves,
                        persistence: blend.persistence,
                        scale: blend.scale,
                        amplitude: blend.amplitude
                    }
                }));
                const { biome } = BiomeQuery.FindByWorldPos({ x: worldX + blendX, y: worldY + blendY });

                const noiseOffset = Math.round(Noise.GetNoise({
                    noiseType: terrain.noiseType,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: {
                        octaves: terrain.octaves,
                        persistence: terrain.persistence,
                        scale: terrain.scale,
                        amplitude: terrain.amplitude
                    }
                }));
                const detailOffset = Math.round(Noise.GetNoise({
                    noiseType: detail.noiseType,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: {
                        octaves: detail.octaves,
                        persistence: detail.persistence,
                        scale: detail.scale,
                        amplitude: detail.amplitude
                    }
                }));
                const depth = worldY - noiseOffset + detailOffset;

                let material = air;
                let occupancy = 0;

                const layer = biome.layers.find(l => depth >= l.depth.min && depth < l.depth.max);
                if (layer) {
                    const mat = MaterialRegistry.Materials[layer.material.name];
                    if (mat) {
                        material = mat;
                        occupancy = OccupancyIds[layer.material.occupancy];
                    }
                }

                ChunkData.WriteIdentity(views.identity, cellIndex, {
                    materialId: material.id,
                    colorSeed: Math.floor(Math.random() * 256),
                    variantId: 0,
                    occupancy
                });
                ChunkData.WritePhysics(views.physics, cellIndex, {
                    temperature: material.physics.temperature.restingTemperature,
                    pressure: 0,
                    velocityX: 0,
                    velocityY: 0
                });
                ChunkData.WriteState(views.state, cellIndex, {
                    health: 1,
                    lifetime: material.state.lifetime ?? 0,
                    unused0: 0,
                    unused1: 0
                });
            }
        }
    }
}
