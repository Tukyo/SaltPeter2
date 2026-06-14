import type { ChunkAddress, ChunkEntry, ChunkViews } from './chunk/ChunkData';
import type { NoiseOptions, NoiseType } from '../utility/Noise';
import type { StampCell, WorldStamp } from './WorldStamp';

import { BiomeQuery } from './biome/BiomeQuery';
import { ChunkData } from './chunk/ChunkData';
import { LogManager } from '../debug/LogManager';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { MaterialVisualSchema } from '../materials/MaterialVisualSchema';
import { Noise } from '../utility/Noise';
import { OccupancyIds } from '../materials/definitions/MaterialIdentity';
import { WorldConfig } from '../config/WorldConfig';

//@omitfromdocs
export interface StampErosionConfig {
    depth: number;
    noise: {
        type: NoiseType;
        options: NoiseOptions;
        threshold: number;
    };
}

/**
 * Procedural chunk generator.
 * Given a chunk address and seed, runs one or more generation passes to fill
 * identity, physics, and state buffers from scratch.
 * The base pass queries {@link BiomeQuery} for the biome at each cell, applies
 * terrain and detail noise to shift layer boundaries, then writes the matching
 * material from the biome's layer definition.
 */
export class WorldGen {
    private static stamps: WorldStamp[] = [];
    private static erosionConfig: StampErosionConfig | null = null;

    /** Registers stamps to be applied during chunk generation. Call before world creation. @internal */
    public static SetStamps(stamps: WorldStamp[]): void { WorldGen.stamps = stamps; }

    /** Sets the stamp erosion config used to organically dissolve terrain near stamp edges. @internal */
    public static SetStampErosionConfig(config: StampErosionConfig | null): void { WorldGen.erosionConfig = config; }

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
        WorldGen.StampPass(address, views);
        WorldGen.DetailPass(address, seed, views);
        WorldGen.StampErosionPass(address, seed, views);

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
                    options: blend.options
                }));
                const blendY = Math.round(Noise.GetNoise({
                    noiseType: blend.noiseType,
                    coords: { x: worldX + 31337, y: worldY },
                    seed,
                    options: blend.options
                }));
                const { biome } = BiomeQuery.FindByWorldPos({ x: worldX + blendX, y: worldY + blendY });

                const noiseOffset = Math.round(Noise.GetNoise({
                    noiseType: terrain.noiseType,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: terrain.options
                }));
                const detailOffset = Math.round(Noise.GetNoise({
                    noiseType: detail.noiseType,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: detail.options
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

                const layerColor = layer?.detail?.color;
                const colorSeed = layerColor
                    ? Math.round((Noise.GetColorNoise({
                        noiseType: layerColor.type,
                        coords: { x: worldX, y: worldY },
                        seed,
                        weights: layerColor.weights,
                        scale: layerColor.scale,
                    }) + 0.5) / MaterialVisualSchema.GetColorsPerMaterial() * 255)
                    : Math.floor(Math.random() * 256);

                //TODO: Go through all of these and make sure that they are correct
                ChunkData.WriteIdentity(views.identity, cellIndex, {
                    materialId: material.id,
                    colorSeed,
                    variantId: layer?.material.variantId ?? 0,
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

    /** Writes blueprint stamp cells into the chunk, overwriting terrain for any stamp that overlaps. @internal */
    private static StampPass(address: ChunkAddress, views: ChunkViews): void {
        if (WorldGen.stamps.length === 0) { return; }
        const chunkSize = ChunkData.GetChunkSize();
        const chunkWorldPos = { x: address.cx * chunkSize, y: address.cy * chunkSize };

        for (const stamp of WorldGen.stamps) {
            if (!stamp.OverlapsChunk(chunkWorldPos, chunkSize)) { continue; }
            for (let localY = 0; localY < chunkSize; localY++) {
                for (let localX = 0; localX < chunkSize; localX++) {
                    const worldX = chunkWorldPos.x + localX;
                    const worldY = chunkWorldPos.y + localY;
                    const stampCell = stamp.GetCell({ x: worldX, y: worldY });
                    if (!stampCell) { continue; }
                    const cellIndex = localY * chunkSize + localX;
                    ChunkData.WriteIdentity(views.identity, cellIndex, {
                        materialId: MaterialRegistry.Materials[stampCell.material.name].id,
                        colorSeed: Math.round((stampCell.colorIndex + 0.5) / MaterialVisualSchema.GetColorsPerMaterial() * 255),
                        variantId: stampCell.material.variantId ?? 0,
                        occupancy: OccupancyIds[stampCell.material.occupancy],
                    });
                }
            }
        }
    }

    /** 
     * Overlays biome detail material onto static cells using per-biome noise.
     * Uses a blended biome lookup to soften boundary transitions.
     * @internal
     */
    private static DetailPass(address: ChunkAddress, seed: number, views: ChunkViews): void {
        const chunkSize = ChunkData.GetChunkSize();
        const { blend } = WorldConfig.GetConfig().generation;
        const bytesPerCell = ChunkData.GetIdentityBytesPerCell();

        for (let localY = 0; localY < chunkSize; localY++) {
            for (let localX = 0; localX < chunkSize; localX++) {
                const cellIndex = localY * chunkSize + localX;
                const base = cellIndex * bytesPerCell;
                if (views.identity.getUint8(base + 3) !== OccupancyIds.static) { continue; }

                const worldX = address.cx * chunkSize + localX;
                const worldY = address.cy * chunkSize + localY;
                const blendX = Math.round(Noise.GetNoise({
                    noiseType: blend.noiseType,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: blend.options
                }));
                const blendY = Math.round(Noise.GetNoise({
                    noiseType: blend.noiseType,
                    coords: { x: worldX + 31337, y: worldY },
                    seed,
                    options: blend.options
                }));
                const { biome } = BiomeQuery.FindByWorldPos({ x: worldX + blendX, y: worldY + blendY });
                if (!biome.detail) { continue; }

                const currentMaterialId = views.identity.getUint8(base);
                const isNativeMaterial = biome.layers.some(l => {
                    const mat = MaterialRegistry.Materials[l.material.name];
                    return mat !== undefined && mat.id === currentMaterialId;
                });
                if (!isNativeMaterial) { continue; }

                const { detail } = biome;
                const noise = Noise.GetNoise({
                    noiseType: detail.noise.type,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: detail.noise.options,
                });
                if (Math.abs(noise) > detail.threshold) { continue; }

                const mat = MaterialRegistry.Materials[detail.material.name];
                if (!mat) { continue; }
                ChunkData.WriteIdentity(views.identity, cellIndex, {
                    materialId: mat.id,
                    colorSeed: views.identity.getUint8(base + 1),
                    variantId: detail.material.variantId ?? 0,
                    occupancy: OccupancyIds[detail.material.occupancy],
                });
            }
        }
    }

    /** Erodes terrain near stamp edges by converting cells to air based on distance-falloff noise. @internal */
    private static StampErosionPass(address: ChunkAddress, seed: number, views: ChunkViews): void {
        if (!WorldGen.erosionConfig || WorldGen.stamps.length === 0) { return; }
        const { depth, noise } = WorldGen.erosionConfig;
        const chunkSize = ChunkData.GetChunkSize();
        const bytesPerCell = ChunkData.GetIdentityBytesPerCell();
        const air = MaterialRegistry.Materials.air;
        const chunkWorldX = address.cx * chunkSize;
        const chunkWorldY = address.cy * chunkSize;

        const depthSq = depth * depth;
        const nearbyStamps = WorldGen.stamps.filter(stamp => {
            const dx = Math.max(0,
                stamp.worldPos.x - (chunkWorldX + chunkSize),
                chunkWorldX - (stamp.worldPos.x + stamp.contentSize.width)
            );
            const dy = Math.max(0,
                stamp.worldPos.y - (chunkWorldY + chunkSize),
                chunkWorldY - (stamp.worldPos.y + stamp.contentSize.height)
            );
            return (dx * dx + dy * dy) <= depthSq;
        });
        if (nearbyStamps.length === 0) { return; }

        for (let localY = 0; localY < chunkSize; localY++) {
            for (let localX = 0; localX < chunkSize; localX++) {
                const worldX = chunkWorldX + localX;
                const worldY = chunkWorldY + localY;

                let minDistSq = Infinity;
                let nearestCell: StampCell | null = null;
                for (const stamp of nearbyStamps) {
                    const dx = Math.max(0,
                        stamp.worldPos.x - worldX,
                        worldX - (stamp.worldPos.x + stamp.contentSize.width - 1)
                    );
                    const dy = Math.max(0,
                        stamp.worldPos.y - worldY,
                        worldY - (stamp.worldPos.y + stamp.contentSize.height - 1)
                    );
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        const clampedX = Math.max(stamp.worldPos.x, Math.min(worldX, stamp.worldPos.x + stamp.contentSize.width - 1));
                        const clampedY = Math.max(stamp.worldPos.y, Math.min(worldY, stamp.worldPos.y + stamp.contentSize.height - 1));
                        nearestCell = stamp.GetCell({ x: clampedX, y: clampedY });
                    }
                }

                if (minDistSq === 0 || minDistSq > depthSq) { continue; }
                if (nearestCell === null || nearestCell.material.name !== 'air') { continue; }

                const cellIndex = localY * chunkSize + localX;
                const base = cellIndex * bytesPerCell;
                if (views.identity.getUint8(base) === air.id) { continue; }

                const minDist = Math.sqrt(minDistSq);
                const t = 1 - minDist / depth;
                const effectiveThreshold = noise.threshold * (t * t * (3 - 2 * t));

                const noiseValue = Noise.GetNoise({
                    noiseType: noise.type,
                    coords: { x: worldX, y: worldY },
                    seed,
                    options: noise.options,
                });
                if (Math.abs(noiseValue) > effectiveThreshold) { continue; }

                ChunkData.WriteIdentity(views.identity, cellIndex, {
                    materialId: air.id,
                    colorSeed: 0,
                    variantId: 0,
                    occupancy: 0,
                });
                ChunkData.WritePhysics(views.physics, cellIndex, {
                    temperature: air.physics.temperature.restingTemperature,
                    pressure: 0,
                    velocityX: 0,
                    velocityY: 0,
                });
                ChunkData.WriteState(views.state, cellIndex, {
                    health: 0,
                    lifetime: 0,
                    unused0: 0,
                    unused1: 0,
                });
            }
        }
    }
}
