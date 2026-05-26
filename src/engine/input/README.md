<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Input
<!-- HIERARCHY_END -->
# Input

Canvas-scoped mouse input. Tracks position, button state, and bounds, normalised to simulation space on every event.

<!-- API_START -->
---

## API

### [`Input`](Input.ts)
Tracks mouse input relative to the simulation canvas.

```ts
new Nitrate.Input(canvas);
```

| Interfaces & Types |
|--------------------|
```ts
interface InputState {
    pos: Vec2;
    leftDown: boolean;
    middleDown: boolean;
    rightDown: boolean;
    isInside: boolean;
}
```

| Method | Description |
|--------|-------------|
| [`GetState(): InputState`](Input.ts) | Returns a snapshot of the current mouse state. |
| [`Reset(): void`](Input.ts) | Resets all mouse state to defaults. Call on scene transitions to prevent stale input. |

---

<!-- API_END -->