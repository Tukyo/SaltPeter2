import type { ChunkAddress, ChunkEntry } from './ChunkData';

import { ChunkData } from './ChunkData';
import { WorldConfig } from '../../config/WorldConfig';
import { DataPersistenceManager } from '../../data_persistence/DataPersistenceManager';

/** Handles reading and writing chunk binary data to disk via DataPersistenceManager. */
export class ChunkPersistence {
    private readonly dataPersistenceManager: DataPersistenceManager;

    constructor() {
        if (!DataPersistenceManager.Instance) {
            throw new Error('DataPersistenceManager must be initialized before ChunkPersistence.');
        }
        this.dataPersistenceManager = DataPersistenceManager.Instance;
    }

    /** Returns the relative file path for a chunk's binary file. @internal */
    private ChunkPath(address: ChunkAddress): string {
        const { save } = WorldConfig.GetConfig();
        return `${save.worldPath}/${save.chunkPath(address.cx, address.cy)}`;
    }

    /** Returns true if a save file exists for the given chunk address. @internal */
    public async HasChunk(address: ChunkAddress): Promise<boolean> {
        return this.dataPersistenceManager.FileExists(this.ChunkPath(address));
    }

    /** Serializes all three chunk buffers into a single binary blob and writes it to disk. @internal */
    public async SaveChunk(address: ChunkAddress, entry: ChunkEntry): Promise<void> {
        const identitySize = ChunkData.GetIdentityBytesPerChunk();
        const physicsSize = ChunkData.GetPhysicsBytesPerChunk();
        const stateSize = ChunkData.GetStateBytesPerChunk();

        const out = new ArrayBuffer(identitySize + physicsSize + stateSize);
        const view = new Uint8Array(out);
        view.set(new Uint8Array(entry.identity), 0);
        view.set(new Uint8Array(entry.physics), identitySize);
        view.set(new Uint8Array(entry.state), identitySize + physicsSize);

        await this.dataPersistenceManager.WriteFile(this.ChunkPath(address), out);
    }

    /**
     * Reads the chunk binary from disk and splits it back into identity, physics, and state buffers.
     * Returns null if no file exists.
     * @internal
     */
    public async LoadChunk(
        address: ChunkAddress
    ): Promise<{ identity: ArrayBuffer; physics: ArrayBuffer; state: ArrayBuffer } | null> {
        const data = await this.dataPersistenceManager.ReadFile(this.ChunkPath(address));
        if (!data) { return null; }

        const identitySize = ChunkData.GetIdentityBytesPerChunk();
        const physicsSize = ChunkData.GetPhysicsBytesPerChunk();

        return {
            identity: data.slice(0, identitySize),
            physics: data.slice(identitySize, identitySize + physicsSize),
            state: data.slice(identitySize + physicsSize),
        };
    }
}
