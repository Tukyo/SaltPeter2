<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Debug
<!-- HIERARCHY_END -->
# Debug

Runtime diagnostic tools for the active scene. 

Overlays are toggled by hotkeys defined in [`KeybindConfig`](../config/KeybindConfig.ts) and render directly on top of the simulation canvas without affecting sim state.

<!-- API_START -->
---

## API

### [`AnalyticsOverlay`](AnalyticsOverlay.ts)
Live material cell-count overlay for the active scene.

Toggle visibility with the keybind set in [`KeybindConfig`](../config/KeybindConfig.ts).

```ts
new Nitrate.AnalyticsOverlay();
```


---

### [`ChunkOverlay`](ChunkOverlay.ts)
Renders the chunk grid, biome labels, and world origin axes as a 2D canvas overlay.

Owned and driven by [`DebugOverlay`](DebugOverlay.ts) — do not instantiate directly.


---

### [`DebugOverlay`](DebugOverlay.ts)
Toggles debug visualisation overlays for the active scene.

Each overlay layer is bound to a hotkey defined in [`KeybindConfig`](../config/KeybindConfig.ts).

```ts
new Nitrate.DebugOverlay();
```


---

### [`DebugOverlayBadge`](DebugOverlayBadge.ts)
Small label that shows the active debug layer.


---

### [`GameObjectOverlay`](GameObjectOverlay.ts)
Debug overlay for visualising GameObject state in the simulation.
Driven by [`DebugOverlay`](DebugOverlay.ts) — do not instantiate directly.


---

### [`LogManager`](LogManager.ts)
Singleton logger that routes all engine console output through a tag-based
filter and colour formatter before forwarding to the browser console.

```ts
new Nitrate.LogManager({ quiet: true, filterMode: 'allowlist', filters: ['Sim'] });
```

| Interfaces & Types |
|--------------------|
```ts
interface LogManagerOptions {
    quiet?: boolean;
    showTimestamps?: boolean;
    filterMode?: 'allowlist' | 'blocklist'
    filters?: LogTag[];
}
```

```ts
interface LogParams {
    text: string;
    options?: {
        noisy?: boolean;
        tags?: LogTag[];
        data?: unknown;
    }
}
```

| Method | Description |
|--------|-------------|
| [`Log(params: LogParams): void`](LogManager.ts) | Emits a standard log entry. |
| [`LogWarning(params: LogParams): void`](LogManager.ts) | Emits a warning log entry. |
| [`LogError(params: LogParams): void`](LogManager.ts) | Emits an error log entry. |

---

### [`PressureOverlay`](PressureOverlay.ts)
Reads the physics texture and renders per-cell pressure as a greyscale wash.

Owned and driven by [`DebugOverlay`](DebugOverlay.ts) — do not instantiate directly.


---

### [`TemperatureOverlay`](TemperatureOverlay.ts)
Reads the physics texture and renders per-cell temperature as a heatmap.

Owned and driven by [`DebugOverlay`](DebugOverlay.ts) — do not instantiate directly.


---

<!-- API_END -->