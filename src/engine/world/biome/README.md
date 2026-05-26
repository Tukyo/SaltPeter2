<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [World](../README.md) / Biome
<!-- HIERARCHY_END -->
# Biome

Biome definitions and spatial lookup for world generation.

[`BiomeRegistry`](BiomeRegistry.ts) auto-discovers every biome definition at startup — no manual registration needed. [`BiomeQuery`](BiomeQuery.ts) sits on top for runtime reads, resolving world-space positions to biome definitions via the [`WorldMap`](../WorldMap.ts) chunk table.

New biomes go in [`definitions/`](definitions/README.md).

<!-- API_START -->
---

## API

### [`BiomeQuery`](BiomeQuery.ts)
Spatial lookup helpers for biome data.
Resolves world-space positions to biome definitions via the [`WorldMap`](../WorldMap.ts) chunk table.

| Interfaces & Types |
|--------------------|
```ts
interface BiomeLookup {
    biome: BiomeDefinition;
    entry: WorldChunk;
}
```

| Method | Description |
|--------|-------------|
| [`static FindByWorldPos(pos: Vec2): BiomeLookup`](BiomeQuery.ts) | Converts a world-space position to a chunk address and returns the matching biome and WorldChunk entry. |

---

### [`BiomeRegistry`](BiomeRegistry.ts)
Auto-discovers and indexes every biome definition in the `definitions/` directory.
Uses `import.meta.glob` to eagerly load all `.ts` files, then walks every export
looking for objects with `name` and `id` properties.


---

<!-- API_END -->

<!-- TABLE_OF_CONTENTS_START -->
## Table of Contents

[`definitions/`](definitions/README.md)  

<!-- TABLE_OF_CONTENTS_END -->
