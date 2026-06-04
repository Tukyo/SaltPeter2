<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Input
<!-- HIERARCHY_END -->
# Input

Input handler. Tracks mouse and keyboard events, providing game layer subscriptions and unsubscriptions with engine layer controls.

<!-- API_START -->
---

## API

### [`Input`](Input.ts)
Tracks mouse and keyboard input. All input should flow through this class
so that guardrails like blur-clearing apply universally.

```ts
new Nitrate.Input(canvas);
```

| Interfaces & Types |
|--------------------|
```ts
interface MouseState {
    pos: Vec2;
    leftDown: boolean;
    middleDown: boolean;
    rightDown: boolean;
    isInside: boolean;
}
```

```ts
type MouseButton = 0 | 1 | 2;
```

| Method | Description |
|--------|-------------|
| [`GetMouseState(): MouseState`](Input.ts) | Returns a snapshot of the current mouse state. |
| [`OnMouseDown(button: MouseButton, callback: (e: MouseEvent) => void): () => void`](Input.ts) | Subscribes to mousedown on the canvas for a specific button. Returns an unsubscribe function. |
| [`OnMouseUp(button: MouseButton, callback: (e: MouseEvent) => void): () => void`](Input.ts) | Subscribes to mouseup (window-level, catches drag-releases). Returns an unsubscribe function. |
| [`OnMouseMove(callback: (e: MouseEvent) => void): () => void`](Input.ts) | Subscribes to mousemove on the canvas. Returns an unsubscribe function. |
| [`ResetMouseState(): void`](Input.ts) | Resets all mouse state to defaults. Call on scene transitions to prevent stale input. |
| [`IsKeyDown(key: string): boolean`](Input.ts) | Returns true while the given key is held. |
| [`OnKeyDown(key: string, callback: () => void): () => void`](Input.ts) | Subscribes to the first keydown for a key (repeat events ignored). Returns an unsubscribe function. |
| [`OnKeyUp(key: string, callback: () => void): () => void`](Input.ts) | Subscribes to keyup for a key. Returns an unsubscribe function. |

---

<!-- API_END -->