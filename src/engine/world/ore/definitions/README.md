

<!-- HIERARCHY_START -->
[Nitrate](../../../README.md) / [World](../../README.md) / [Ore](../README.md) / Definitions
<!-- HIERARCHY_END -->

<!-- API_START -->
---

## API

### [`Coal`](Coal.ts)

| Interfaces & Types |
|--------------------|
```ts
const Coal: OreDefinition = {
    id: OreIds.coal,
    name: 'coal',

    material: { name: 'coal', occupancy: 'dynamic' },
    pocket: {
        size: { x: { min: 30, max: 60 }, y: { min: 2, max: 4 } },
        rotation: 0.4,
        noise: {
            type: NoiseType.Perlin,
            options: { octaves: 3, persistence: 0.6, scale: 10, amplitude: 8 }
        }
    },
    pattern: { type: ColorNoiseType.Scatter },
    depth: { min: -Infinity, max: -64 }
};
```

---

<!-- API_END -->
