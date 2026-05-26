<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [World](../README.md) / Chunk
<!-- HIERARCHY_END -->
# Chunk

Chunk storage, streaming, and buffer layout for the world system.

[`ChunkManager`](ChunkManager.ts) is the runtime entry point — use `Get()` to read a loaded chunk or `Entries()` to iterate all loaded chunks. Loading, generation, saving, and GPU upload are handled internally by the world streaming pipeline.

[`ChunkData`](ChunkData.ts) defines the CPU-side data model. The `ChunkAddress` and `ChunkEntry` interfaces are the types you'll work with when reading chunks from the manager.

[`Chunk`](Chunk.ts) provides static helpers for deriving sim texture dimensions from canvas size and chunk config — used internally by the simulation and world systems.

<!-- API_START -->
---

## API

### [`Chunk`](Chunk.ts)
 Static helpers for computing sim texture dimensions and shift thresholds from canvas size and chunk config.


---

### [`ChunkData`](ChunkData.ts)
 Static accessors and writers for chunk buffer layout — sizes, byte strides, and per-cell DataView writes.

| Interfaces & Types |
|--------------------|
```ts
interface ChunkAddress {
    cx: number;
    cy: number;
}
```

```ts
interface ChunkEntry {
    address: ChunkAddress;
    identity: ArrayBuffer;
    physics: ArrayBuffer;
    state: ArrayBuffer;
}
```

| Method | Description |
|--------|-------------|
| [`static GetChunkSize(): number`](ChunkData.ts) | Returns the configured chunk size in cells. |
| [`static GetKey(address: ChunkAddress): string`](ChunkData.ts) | Returns the canonical string key for a chunk address, used as the Map key in ChunkManager. |

---

### [`ChunkManager`](ChunkManager.ts)
 Owns the in-memory chunk map, handles load/generate/save/unload, and uploads chunk data to the GPU ping-pong textures.

| Method | Description |
|--------|-------------|
| [`Get(address: ChunkAddress): ChunkEntry \| null`](ChunkManager.ts) | Returns the chunk entry for an address if it is currently loaded, or null. |
| [`Entries(): IterableIterator<ChunkEntry>`](ChunkManager.ts) | Iterates over all currently loaded chunk entries. |

---

### [`ChunkPersistence`](ChunkPersistence.ts)
 Handles reading and writing chunk binary data to disk via DataPersistenceManager.


---

<!-- API_END -->