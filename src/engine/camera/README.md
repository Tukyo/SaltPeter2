<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Camera
<!-- HIERARCHY_END -->

# Camera
World-space panning — scrolls the simulation viewport relative to the world.

Tracks the camera's pixel offset, rate-limits pan movement so the viewport never outpaces chunk loading, and converts world-space positions to canvas coordinates.

<!-- API_START -->
---

## API

### [`Camera`](Camera.ts)
Tracks the camera's world-space scroll offset and maps world positions to screen space.
Panning is rate-limited per frame to prevent the sim window from shifting faster than chunks can load.

| Method | Description |
|--------|-------------|
| [`GetCameraPos(): Vec2`](Camera.ts) | Returns the camera's current world-space scroll offset in pixels. Positive x is right; positive y is up. |
| [`Pan(dx: number, dy: number): void`](Camera.ts) | Moves the camera by delta in world space. Positive x pans right; positive y pans up. |
| [`WorldToScreen(worldPos: Vec2, canvas: HTMLCanvasElement): Vec2`](Camera.ts) | Converts a world-space position to canvas pixel coordinates relative to the camera's current offset. |

---

<!-- API_END -->