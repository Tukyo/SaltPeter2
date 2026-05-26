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

| Method | Description |
|--------|-------------|
| [`static ShapeIndex(shape: BrushShape): number`](BrushManager.ts) | Returns the current shape of the brush as a number. |
| [`Block(): void`](BrushManager.ts) | Prevents brush strokes from being applied. Useful for scenarios like when you need to capture mouse input for other purposes (e.g. drawing a bounding box or placing an anchor). |
| [`Unblock(): void`](BrushManager.ts) | Restores normal brush painting after a [`Block`](../simulation/SimulationManager.ts) call. |
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
 Provides the state of the brush.

| Method | Description |
|--------|-------------|
| [`GetMaterialId(): MaterialId`](BrushState.ts) | Returns the active material ID. |
| [`SetMaterialId(value: MaterialId): void`](BrushState.ts) | Sets the active material ID. |
| [`GetSize(): number`](BrushState.ts) | Returns the brush radius in simulation cells. |
| [`SetSize(value: number): void`](BrushState.ts) | Sets the brush radius in simulation cells. |
| [`GetDensity(): number`](BrushState.ts) | Returns the brush density (0–1 fill probability per cell). |
| [`SetDensity(value: number): void`](BrushState.ts) | Sets the brush density (0–1 fill probability per cell). |
| [`GetMode(): BrushMode`](BrushState.ts) | Returns the current brush mode (draw or erase). |
| [`SetMode(value: BrushMode): void`](BrushState.ts) | Sets the brush mode (draw or erase). |
| [`GetShape(): BrushShape`](BrushState.ts) | Returns the current brush shape (circle or square). |
| [`SetShape(value: BrushShape): void`](BrushState.ts) | Sets the brush shape (circle or square). |
| [`GetType(): BrushType`](BrushState.ts) | Returns the brush stroke type (noise or palette). |
| [`SetType(value: BrushType): void`](BrushState.ts) | Sets the brush stroke type (noise or palette). |
| [`GetColor(): number`](BrushState.ts) | Returns the selected palette color index for the current stroke. |
| [`SetColor(value: number): void`](BrushState.ts) | Sets the palette color index for the current stroke. |
| [`GetVariantId(): number`](BrushState.ts) | Returns the active material variant ID (0 = no variant). |
| [`SetVariantId(value: number): void`](BrushState.ts) | Sets the active material variant ID (0 = no variant). |
| [`GetOccupancy(): MaterialOccupancy`](BrushState.ts) | Returns whether placed cells are dynamic (simulated) or static. |
| [`SetOccupancy(value: MaterialOccupancy): void`](BrushState.ts) | Sets whether placed cells are dynamic (simulated) or static. |
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
    | 'draw'
    | 'erase';
```

```ts
type BrushType =
    | 'noise'
    | 'palette';
```

---

<!-- API_END -->
