<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Ui](../README.md) / Panels
<!-- HIERARCHY_END -->
# Panels

Engine UI panel implementations, each wrapping a [`CollapsiblePanel`](../CollapsiblePanel.ts) and targeting a specific engine system.

<!-- API_START -->
---

## API

### [`BrushPanel`](BrushPanel.ts)
Brush settings panel.

Builds and manages controls for size, density, shape, mode, type, snap, and palette.
Each control is optional and configured via BrushOptions.

```ts
new Nitrate.BrushPanel({options: BrushOptions})
```

| Interfaces & Types |
|--------------------|
```ts
interface BrushOptions {
    size?: { min: number; max: number; default?: number; show?: boolean; };
    density?: { min: number; max: number; default?: number; show?: boolean; };
    shape?: { default?: BrushShape; show?: boolean; };
    mode?: { default?: BrushMode; show?: boolean; };
    type?: { default?: BrushType; show?: boolean; };
    snap?: { default?: boolean; show?: boolean; };
}
```

| Method | Description |
|--------|-------------|
| [`GetSize(): number`](BrushPanel.ts) | Returns the current brush size, or 0 if no size control exists. |
| [`GetDensity(): number`](BrushPanel.ts) | Returns the current brush density as a 0–1 value, or 1.0 if no density control exists. |
| [`GetShape(): BrushShape`](BrushPanel.ts) | Returns the current brush shape, or 'circle' if no shape control exists. |
| [`GetMode(): BrushMode`](BrushPanel.ts) | Returns the current brush mode, or 'draw' if no mode control exists. |
| [`GetBrushType(): BrushType`](BrushPanel.ts) | Returns the current brush type, or 'noise' if no type control exists. |
| [`GetSnap(): boolean`](BrushPanel.ts) | Returns whether snap is enabled, or false if no snap control exists. |
| [`GetColorVariant(): number`](BrushPanel.ts) | Returns the currently selected palette color variant index, or 0 if no palette exists. |
| [`ApplySettings(): void`](BrushPanel.ts) | Pushes all current panel values to BrushState. Call after BrushManager reinitializes. |
| [`SetPaletteColors(colors: Color[]): void`](BrushPanel.ts) | Updates the palette swatch colors from an array of Color values. |
| [`SetWheelTarget(element: HTMLElement): void`](BrushPanel.ts) | Sets the element that receives wheel events for brush size adjustment, removing the listener from the previous target. |

---

### [`DebugPanel`](DebugPanel.ts)
Debug overlay panel.

Tracks FPS, frame time, simulation/physics step counts, and hovered cell material data via GPU texture readback.
Collapsed by default.

```ts
new Nitrate.DebugPanel();
```


---

### [`MaterialsPanel`](MaterialsPanel.ts)
Material selection panel.

Provides an active material dropdown, occupancy toggle, phase/tag filters, and a per-material variant picker.

```ts
new Nitrate.MaterialsPanel({options: MaterialsPanelParams})
```

| Interfaces & Types |
|--------------------|
```ts
interface MaterialsPanelParams {
    activeMaterial?: {
        defaultMaterial?: MaterialName;
        show?: boolean;
    };
    occupancy?: {
        default?: MaterialOccupancy;
        show?: boolean;
    };
    phases?: {
        options?: MaterialPhase | MaterialPhase[];
        default?: MaterialPhase | MaterialPhase[];
        show?: boolean;
    };
    tags?: {
        options?: string | string[];
        show?: boolean;
    };
}
```

| Method | Description |
|--------|-------------|
| [`GetMaterialId(): MaterialId`](MaterialsPanel.ts) | Returns the currently selected material ID, or 0 if no material control exists. |

---

### [`RenderingPanel`](RenderingPanel.ts)
Rendering configuration panel.

Supports two modes: scaled (resolution and scale controls) and grid (fixed size presets).
Configured entirely via RenderingPanelParams at construction.

```ts
new Nitrate.RenderingPanel(params: RenderingPanelParams)
```

| Interfaces & Types |
|--------------------|
```ts
type RenderingPanelParams = ScaledParams | GridParams;
```

```ts
interface ScaledParams {
    type: 'scaled';
    resolution?: ReadonlyArray<{ value: number; label?: string }>;
    scale?: { min: number; max: number; default?: number; step?: number };
    onResolutionChange?: () => void;
    onScaleChange?: () => void;
}
```

```ts
interface GridParams {
    type: 'grid';
    sizes?: ReadonlyArray<{ width: number; height: number; label?: string }>;
    onChange?: () => void;
}
```

| Method | Description |
|--------|-------------|
| [`GetResolution(): number`](RenderingPanel.ts) | Returns the currently selected resolution value, or 0 (native) if no resolution control exists. |
| [`GetResolutionScale(): number`](RenderingPanel.ts) | Returns the current resolution scale as a 0–1 value, or 1.0 if no scale control exists. |
| [`GetGridDimensions(): { width: number; height: number }`](RenderingPanel.ts) | Returns the width and height of the currently selected grid size preset, or 64×64 if no grid control exists. |
| [`SetGridSize(w: number, h: number): boolean`](RenderingPanel.ts) | Switches to the grid preset that matches (w, h) exactly, or the smallest preset whose dimensions both fit (w, h). Returns true if the active preset actually changed. |

---

### [`ScenePanel`](ScenePanel.ts)
Scene action panel. Provides export, clear, and exit buttons.
Clear and exit prompt for confirmation when the scene is dirty.

```ts
new Nitrate.ScenePanel({params?: ScenePanelParams})
```

| Interfaces & Types |
|--------------------|
```ts
interface ScenePanelParams {
    export?: { onExport?: () => void; }
    clear?: { onClear?: () => Promise<void> | void; }
}
```


---

### [`SimulationPanel`](SimulationPanel.ts)
Simulation controls panel. Provides play/pause buttons and a simulation speed slider.

```ts
new Nitrate.SimulationPanel();
```

| Method | Description |
|--------|-------------|
| [`SetPaused(paused: boolean): void`](SimulationPanel.ts) | Sets the active state of the play and pause buttons to reflect the current paused state. |
| [`GetSimSpeed(): number`](SimulationPanel.ts) | Returns the current simulation speed multiplier from the speed slider. |

---

<!-- API_END -->