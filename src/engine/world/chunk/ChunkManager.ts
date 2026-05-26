import type { ChunkAddress, ChunkEntry } from './ChunkData';
import type { PingPongTargets } from '../../simulation/PingPongTargets';
import type { Size2D, Vec2 } from '../../definitions/Primitives';

import { ChunkData } from './ChunkData';
import { ChunkPersistence } from './ChunkPersistence';
import { LogManager } from '../../debug/LogManager';
import { NitrateProcess } from '../../NitrateProcess';
import { World } from '../World';
import { WorldGen } from '../WorldGen';

/** Owns the in-memory chunk map, handles load/generate/save/unload, and uploads chunk data to the GPU ping-pong textures. */
export class ChunkManager extends NitrateProcess {
    public static Instance: ChunkManager | null = null;

    private readonly chunks = new Map<string, ChunkEntry>();
    private readonly persistence = new ChunkPersistence();

    constructor() {
        super();
        ChunkManager.Instance = this;
    }

    public Start(): void {
        LogManager.Instance?.Log({
            text: 'ChunkManager start.',
            options: { tags: ["Chunk", "NitrateProcessInit"] }
        });
    }

    /** Returns the chunk entry for an address if it is currently loaded, or null. */
    public Get(address: ChunkAddress): ChunkEntry | null {
        return this.chunks.get(ChunkData.GetKey(address)) ?? null;
    }

    /** Iterates over all currently loaded chunk entries. */
    public Entries(): IterableIterator<ChunkEntry> {
        return this.chunks.values();
    }

    /** Loads and uploads all chunks covering the sim texture region to the GPU on scene start. @internal */
    public async InitializeChunks(
        device: GPUDevice,
        pingPong: PingPongTargets,
        size: Size2D
    ): Promise<void> {
        if (!World.Instance) { return; }
        const { x: simOriginX, y: simOriginY } = World.Instance.GetSimOrigin();
        const { width, height } = size;

        const chunkSize = ChunkData.GetChunkSize();
        const startCX = Math.floor(simOriginX / chunkSize);
        const startCY = Math.floor(simOriginY / chunkSize);
        const endCX = Math.floor((simOriginX + width - 1) / chunkSize);
        const endCY = Math.floor((simOriginY + height - 1) / chunkSize);
        let uploaded = 0;

        for (let cy = startCY; cy <= endCY; cy++) {
            for (let cx = startCX; cx <= endCX; cx++) {
                const chunk = await this.GetOrLoad({ cx, cy });
                const texX = cx * chunkSize - simOriginX;
                const texY = cy * chunkSize - simOriginY;
                const origin = { x: texX, y: texY };
                const extent: GPUExtent3DStrict = [chunkSize, chunkSize];
                const identityBPR = chunkSize * ChunkData.GetIdentityBytesPerCell();
                const physicsBPR = chunkSize * ChunkData.GetPhysicsBytesPerCell();
                const stateBPR = chunkSize * ChunkData.GetStateBytesPerCell();
                device.queue.writeTexture(
                    { texture: pingPong.currentIdentity, origin }, chunk.identity, { bytesPerRow: identityBPR }, extent
                );
                device.queue.writeTexture(
                    { texture: pingPong.currentPhysics, origin }, chunk.physics, { bytesPerRow: physicsBPR }, extent
                );
                device.queue.writeTexture(
                    { texture: pingPong.currentState, origin }, chunk.state, { bytesPerRow: stateBPR }, extent
                );
                uploaded++;
            }
        }

        LogManager.Instance?.Log({
            text: `Initialized ${uploaded} chunks.`,
            options: { tags: ['Chunk'] }
        });
    }

    /** Returns the chunk at the given address — from memory, disk, or fresh generation — in that priority order. @internal */
    public async GetOrLoad(address: ChunkAddress): Promise<ChunkEntry> {
        const existing = this.Get(address);
        if (existing) { return existing; }

        const saved = await this.persistence.LoadChunk(address);
        if (saved) {
            const entry: ChunkEntry = {
                address,
                identity: saved.identity,
                physics: saved.physics,
                state: saved.state,
            };
            this.chunks.set(ChunkData.GetKey(address), entry);
            LogManager.Instance?.Log({
                text: `Chunk (${address.cx},${address.cy}) loaded from disk.`,
                options: { tags: ['Chunk'], noisy: true }
            });
            return entry;
        }

        await World.Instance?.IsWorldReady();
        const entry = WorldGen.Generate(address, World.Instance?.GetSeed() ?? 0);
        this.chunks.set(ChunkData.GetKey(address), entry);
        LogManager.Instance?.Log({
            text: `Chunk (${address.cx},${address.cy}) generated.`,
            options: { tags: ['Chunk'], noisy: true }
        });
        return entry;
    }

    /** Persists the chunk to disk and removes it from the in-memory map. @internal */
    public async SaveAndUnload(address: ChunkAddress): Promise<void> {
        const entry = this.Get(address);
        if (!entry) { return; }
        await this.persistence.SaveChunk(address, entry);
        this.Unload(address);
    }

    /** Uploads the newly exposed strip of chunks after a shift. @internal */
    public async UploadEdgeChunks(
        device: GPUDevice,
        pingPong: PingPongTargets,
        delta: Vec2,
        simOrigin: Vec2
    ): Promise<void> {
        const chunkSize = ChunkData.GetChunkSize();
        const { width, height } = pingPong;
        const { x: simOriginX, y: simOriginY } = simOrigin;

        const stripTexX = delta.x > 0 ? width - Math.abs(delta.x) : 0;
        const stripTexY = delta.y > 0 ? height - Math.abs(delta.y) : 0;
        const stripW = delta.x !== 0 ? Math.abs(delta.x) : width;
        const stripH = delta.y !== 0 ? Math.abs(delta.y) : height;

        const startCX = Math.floor((stripTexX + simOriginX) / chunkSize);
        const startCY = Math.floor((stripTexY + simOriginY) / chunkSize);
        const endCX = Math.floor((stripTexX + stripW - 1 + simOriginX) / chunkSize);
        const endCY = Math.floor((stripTexY + stripH - 1 + simOriginY) / chunkSize);

        for (let cy = startCY; cy <= endCY; cy++) {
            for (let cx = startCX; cx <= endCX; cx++) {
                const chunk = await this.GetOrLoad({ cx, cy });
                // Recompute origin after the async load — the sim may have shifted since this call was made.
                // Using the stale captured simOriginX/Y would place the chunk at the wrong texture position.
                const liveOrigin = World.Instance?.GetSimOrigin();
                if (!liveOrigin) { continue; }
                const texX = cx * chunkSize - liveOrigin.x;
                const texY = cy * chunkSize - liveOrigin.y;
                if (texX < 0 || texX + chunkSize > width || texY < 0 || texY + chunkSize > height) {
                    continue;
                }
                const origin = { x: texX, y: texY };
                const extent: GPUExtent3DStrict = [chunkSize, chunkSize];
                device.queue.writeTexture(
                    { texture: pingPong.currentIdentity, origin },
                    chunk.identity,
                    { bytesPerRow: chunkSize * ChunkData.GetIdentityBytesPerCell() },
                    extent
                );
                device.queue.writeTexture(
                    { texture: pingPong.currentPhysics, origin },
                    chunk.physics,
                    { bytesPerRow: chunkSize * ChunkData.GetPhysicsBytesPerCell() },
                    extent
                );
                device.queue.writeTexture(
                    { texture: pingPong.currentState, origin },
                    chunk.state,
                    { bytesPerRow: chunkSize * ChunkData.GetStateBytesPerCell() },
                    extent
                );
            }
        }

    }

    /** Removes a chunk from the in-memory map without saving it. @internal */
    public Unload(address: ChunkAddress): void {
        this.chunks.delete(ChunkData.GetKey(address));
        LogManager.Instance?.Log({
            text: `Chunk (${address.cx},${address.cy}) unloaded.`,
            options: { tags: ['Chunk'], noisy: true }
        });
    }

    public OnResize(): void {
        LogManager.Instance?.Log({
            text: 'ChunkManager OnResize.',
            options: { tags: ['Chunk'] }
        });
    }

    public OnDestroy(): void {
        this.chunks.clear();
        if (ChunkManager.Instance === this) {
            ChunkManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared ChunkManager singleton instance.',
                options: { tags: ["Chunk", "NitrateProcessDestroy"] }
            });
        }
    }
}
