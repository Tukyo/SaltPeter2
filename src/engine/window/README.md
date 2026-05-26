<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Window
<!-- HIERARCHY_END -->
# Window

Manages the browser window lifecycle. Add `new Nitrate.WindowManager()` to a scene to automatically handle resize events for that scene.

<!-- API_START -->
---

## API

### [`WindowManager`](WindowManager.ts)
Listens for browser window resize events and drives the engine resize pipeline.

```ts
new Nitrate.WindowManager();
```

| Method | Description |
|--------|-------------|
| [`BlockResize(): void`](WindowManager.ts) | Prevents any further resize events from being processed until UnblockResize is called. |
| [`UnblockResize(): void`](WindowManager.ts) | Resumes resize event processing after a BlockResize call. |
| [`ScheduleResize(): void`](WindowManager.ts) | Schedules a resize after a short debounce. Resets the timer on each call. |

---

<!-- API_END -->