<!-- HIERARCHY_START -->
[Nitrate](../../../README.md) / [World](../../README.md) / [Biome](../README.md) / Definitions
<!-- HIERARCHY_END -->
# Definitions

Individual biome definitions. Each biome implements [`BiomeDefinition`](BiomeModel.ts) with a list of depth layers mapping material and occupancy to a depth range.

<!-- API_START -->
---

## API

### [`BiomeIdentity`](BiomeIdentity.ts)

| Interfaces & Types |
|--------------------|
```ts
type BiomeName = keyof typeof BiomeIds;
```

```ts
type BiomeId = (typeof BiomeIds)[BiomeName];
```

---

### [`BiomeModel`](BiomeModel.ts)

| Interfaces & Types |
|--------------------|
```ts
interface BiomeDefinition {
    id: BiomeId;
    name: BiomeName;
    layers: readonly BiomeLayer[];
    stamps?: BiomeStampMaterialMap;
    detail?: BiomeDetail;
    ores?: readonly OreName[];
}
```

```ts
interface BiomeMaterial {
    name: MaterialName;
    occupancy: MaterialOccupancy;
    variantId?: number;
}
```

```ts
interface BiomeLayer {
    material: BiomeLayerMaterial;
    depth: NumberRange;
    detail?: BiomeLayerDetail;
}
```

```ts
interface BiomeLayerDetail {
    color?: {
        type: ColorNoiseType;
        scale: number;
        weights: number[];
    }
}
```

```ts
interface BiomeLayerMaterial extends BiomeMaterial { weight: number; }
```

```ts
interface BiomeFloodFillMaterial extends BiomeMaterial { weight: number; }
```

```ts
interface BiomeStampMaterialMap {
    solid: BiomeMaterial;
    powder: BiomeFloodFillMaterial[];
    liquid: BiomeFloodFillMaterial[];
    detail?: BiomeMaterial;
}
```

```ts
interface BiomeDetail {
    material: BiomeMaterial;
    threshold: number;
    noise: {
        type: NoiseType;
        options: NoiseOptions;
    }
}
```

---

### [`Biomes`](Biomes.ts)

| Interfaces & Types |
|--------------------|
```ts
const BiomeIds = {
    natura: 0,
    antra: 1,
    finitor: 2,
    nivalis: 3,
    desertum: 4,
    glacialis: 5,
    arenosus: 6
} as const;
```

---

<!-- API_END -->