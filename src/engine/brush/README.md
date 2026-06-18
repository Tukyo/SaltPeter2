<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Brush
<!-- HIERARCHY_END -->

# Brush
Paint tool — draws, erases, and previews cells in simulation space.

Manages brush state (size, density, shape, mode), maps mouse input to simulation coordinates, and dispatches the brush compute pass each frame. The schema defines the uniform layout for the GPU pass.

<!-- API_START -->
---

## API

### [`BrushManager`](BrushManager.ts)
Manages the brush and all brush-related processes.

```
new Nitrate.BrushManager();
```

| Method | Description |
|--------|-------------|
| [`SetMarginSize(size: number): void`](BrushManager.ts) | Sets the number of margin cells the brush shader will refuse to write. Pass 0 to disable. |
| [`SetMaterial(id: MaterialId): void`](BrushManager.ts) | Sets the current active material for the brush. |
| [`SetOccupancy(value: MaterialOccupancy): void`](BrushManager.ts) | Sets whether cells placed by the brush are dynamic (simulated) or static (bypasses sim). |
| [`SetVariant(variantId: number): void`](BrushManager.ts) | Sets the current variant for the brush when the active material has any variants. |

---

### [`BrushPreview`](BrushPreview.ts)
Provides the scene with a Brush Preview. Renders a DOM overlay that follows the cursor and reflects the current brush size and shape.
```ts
new Nitrate.BrushPreview();
```


---

### [`BrushState`](BrushState.ts)
 Provides the state of the brush. Initialized by the BrushManager.

| Method | Description |
|--------|-------------|
| [`GetMaterialId(): MaterialId`](BrushState.ts) | Returns the active material ID. |
| [`SetMaterialId(value: MaterialId): void`](BrushState.ts) | Sets the active material ID. |
| [`GetSize(): number`](BrushState.ts) | Returns the brush radius in simulation cells. |
| [`SetSize(value: number): void`](BrushState.ts) | Sets the brush radius in simulation cells. |
| [`GetDensity(): number`](BrushState.ts) | Returns the brush density (0–1 fill probability per cell). |
| [`SetDensity(value: number): void`](BrushState.ts) | Sets the brush density (0–1 fill probability per cell). |
| [`GetMode(): BrushMode`](BrushState.ts) | Returns the current brush mode. |
| [`SetMode(value: BrushMode): void`](BrushState.ts) | Sets the brush mode. |
| [`GetShape(): BrushShape`](BrushState.ts) | Returns the current brush shape. |
| [`SetShape(value: BrushShape): void`](BrushState.ts) | Sets the brush shape. |
| [`GetType(): BrushType`](BrushState.ts) | Returns the brush type. |
| [`SetType(value: BrushType): void`](BrushState.ts) | Sets the brush type. |
| [`GetColor(): number`](BrushState.ts) | Returns the selected palette color index for the current stroke. |
| [`SetColor(value: number): void`](BrushState.ts) | Sets the palette color index for the current stroke. |
| [`GetColorWeights(): [number, number, number, number]`](BrushState.ts) | Returns the per-color weights used by certain brush types (raw, not normalized). |
| [`SetColorWeights(value: [number, number, number, number]): void`](BrushState.ts) | Sets the per-color weights used by certain brush types. |
| [`GetVariantId(): number`](BrushState.ts) | Returns the active material variant ID (0 = no variant). |
| [`SetVariantId(value: number): void`](BrushState.ts) | Sets the active material variant ID (0 = no variant). |
| [`GetOccupancy(): MaterialOccupancy`](BrushState.ts) | Returns whether placed cells are dynamic (simulated) or static. |
| [`SetOccupancy(value: MaterialOccupancy): void`](BrushState.ts) | Sets whether placed cells are dynamic (simulated) or static. |
| [`GetStripeWidth(): number`](BrushState.ts) | Returns the stripe width in cells. |
| [`SetStripeWidth(value: number): void`](BrushState.ts) | Sets the stripe width in cells. |
| [`GetStripeAngle(): number`](BrushState.ts) | Returns the stripe angle in degrees (0–360). |
| [`SetStripeAngle(value: number): void`](BrushState.ts) | Sets the stripe angle in degrees (0–360). |
| [`GetOverlayFilter(): boolean`](BrushState.ts) | Returns whether overlay mode is restricted to the active material and variant. |
| [`SetOverlayFilter(value: boolean): void`](BrushState.ts) | Sets whether overlay mode is restricted to the active material and variant. |
| [`GetSnap(): boolean`](BrushState.ts) | Returns whether brush placement is snapped to the simulation grid. |
| [`SetSnap(value: boolean): void`](BrushState.ts) | Sets whether brush placement is snapped to the simulation grid. |
| [`GetPaletteColors(): ReadonlyArray<Color>`](BrushState.ts) | Returns the current palette color array for the active material or variant. |
| [`SetPaletteColors(colors: Color[]): void`](BrushState.ts) | Sets the palette color array for the active material or variant. |

---

### [`BrushTypes`](BrushTypes.ts)

| Interfaces & Types |
|--------------------|
```ts
type BrushShape =
    | 'circle'
    | 'square';
```

```ts
type BrushMode =
    | 'fill'
    | 'mask'
    | 'overlay';
```

```ts
type BrushType =
    | 'noise'
    | 'palette'
    | 'scatter'
    | 'boxes'
    | 'circles'
    | 'stripes';
```

---

<!-- API_END -->
