

<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [World](../README.md) / Ore
<!-- HIERARCHY_END -->
Ore definitions and spatial lookup for world generation.

New ores go in [`definitions/`](definitions/README.md).
<!-- API_START -->
---

## API

### [`OreIdentity`](OreIdentity.ts)

| Interfaces & Types |
|--------------------|
```ts
type OreName = keyof typeof OreIds;
```

```ts
type OreId = (typeof OreIds)[OreName];
```

---

### [`OreModel`](OreModel.ts)

| Interfaces & Types |
|--------------------|
```ts
interface OreDefinition {
    id: OreId;
    name: OreName;

    material: BiomeMaterial;
    pocket: OrePocket;
    pattern: OrePattern;

    depth: NumberRange;
}
```

```ts
interface OrePocket {
    size: { x: NumberRange, y: NumberRange };
    rotation?: number;
    noise: {
        type: NoiseType;
        options: NoiseOptions;
    }
}
```

```ts
interface OrePattern {
    type: ColorNoiseType;
    weights?: number[];
    scale?: number;
    angle?: number;
}
```

---

### [`OreRegistry`](OreRegistry.ts)
Auto-discovers and indexes every ore definition in the `definitions/` directory.
Uses `import.meta.glob` to eagerly load all `.ts` files, then walks every export
looking for objects with `name` and `id` properties.


---

### [`Ores`](Ores.ts)

| Interfaces & Types |
|--------------------|
```ts
const OreIds = {
    coal: 0,
    iron: 1,
    copper: 2,
    lead: 3,
    silver: 4,
    tin: 5,
    aluminum: 6,
    diamond: 7
} as const;
```

---

<!-- API_END -->
