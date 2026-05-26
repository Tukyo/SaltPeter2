<!-- HIERARCHY_START -->
[Nitrate](../README.md) / World
<!-- HIERARCHY_END -->
# World

Manages the infinite world — sim origin tracking, chunk streaming, and procedural generation.

[`World`](World.ts) is the entry point process. Add it to a scene to activate world scrolling. It owns the sim origin and shifts the simulation window by one chunk whenever the camera crosses a threshold, coordinating readback, blit, and upload with [`ChunkManager`](chunk/ChunkManager.ts).

[`WorldMap`](WorldMap.ts) is the authored layout — edit it to define which biomes appear in which depth layers and how wide each column is. [`WorldGen`](WorldGen.ts) uses that layout to generate new chunks procedurally when no save exists.

<!-- API_START -->
---

## API

### [`World`](World.ts)
Central process for the world simulation window.
Tracks the sim origin, handles world scrolling, and coordinates chunk lifecycle with ChunkManager.

| Interfaces & Types |
|--------------------|
```ts
interface WorldMetadata {
    seed: number;
}
```

| Method | Description |
|--------|-------------|
| [`GetSimOrigin(): Vec2`](World.ts) | Returns the world-space cell coordinate of the simulation texture's top-left corner. |
| [`GetSeed(): number`](World.ts) | Returns the world seed. Loaded from disk on resume, or randomly generated on first run. |
| [`IsWorldReady(): Promise<void>`](World.ts) | Resolves once the world seed has been loaded or created. Await before using the seed in generation. |

---

### [`WorldBlit`](WorldBlit.ts)
GPU blit utility — shifts sim texture layers by one chunk and clears the vacated strip.
Owns the scratch textures required to avoid read-write aliasing during copies.


---

### [`WorldGen`](WorldGen.ts)
Procedural chunk generator.
Given a chunk address and seed, runs one or more generation passes to fill
identity, physics, and state buffers from scratch.
The base pass queries [`BiomeQuery`](biome/BiomeQuery.ts) for the biome at each cell, applies
terrain and detail noise to shift layer boundaries, then writes the matching
material from the biome's layer definition.


---

### [`WorldMap`](WorldMap.ts)
Authored world map — defines which biome occupies which region of chunk space.

Organized into named depth layers, each specifying an ordered sequence of biome columns with widths in chunks.

An originBiome per layer anchors it to cx 0; columns before it extend into negative cx, columns after into positive cx.

Compiles to a flat `WorldChunk` array at startup, indexed by [`BiomeQuery`](biome/BiomeQuery.ts).

| Interfaces & Types |
|--------------------|
```ts
interface WorldChunk {
    biome: BiomeName;
    from: ChunkAddress;
    to: ChunkAddress;
}
```

| Method | Description |
|--------|-------------|
| [`static GetMap(): WorldChunk[]`](WorldMap.ts) | Returns the flat array of world chunks derived from the layout definition. |

---

<!-- API_END -->

<!-- TABLE_OF_CONTENTS_START -->
## Table of Contents

[`biome/`](biome/README.md)  
&nbsp;&nbsp;&nbsp;&nbsp;↳ [`definitions/`](biome/definitions/README.md)  
[`chunk/`](chunk/README.md)  

<!-- TABLE_OF_CONTENTS_END -->
