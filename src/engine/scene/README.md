<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Scene
<!-- HIERARCHY_END -->
# Scene

Scenes are the top-level containers for game state. Each scene extends [`Scene`](Scene.ts), implements `Init()` to spin up its processes, and calls `SceneManager.ExitScene()` when it's done.

All scenes must be registered in `SceneRegistry`:

```ts
{ label: 'My Scene', factory: () => new MyScene() }
```

## Convention

Scenes live in `game/scene/<name>/`. Any scripts the scene delegates should live in a `scripts/` subfolder alongside it.

Since `Scene` extends `NitrateProcess`, any lifecycle methods you add are automatically picked up by the engine:

```ts
import { Nitrate } from '@Nitrate';

export class MyScene extends Nitrate.Scene {
    public async Init(): Promise<void> { }
    public Start(): void { }
    public Update(now: number): void { }
    public OnDestroy(): void { }
}
```

<!-- API_START -->
---

## API

### [`Scene`](Scene.ts)
Base class for all scenes.

Subclasses implement `Init()` to set up processes and state. Transitions between scenes
are handled by [`SceneManager`](SceneManager.ts) — scenes never load themselves.

| Interfaces & Types |
|--------------------|
```ts
interface SceneEntry {
    label: string;
    factory: () => Scene;
}
```


---

### [`SceneManager`](SceneManager.ts)
Bootstraps the application and manages scene transitions.

Constructed once at app startup with a list of `SceneEntry` objects — renders a scene picker UI and launches the selected scene.

| Method | Description |
|--------|-------------|
| [`static MarkDirty(): void`](SceneManager.ts) | Marks the scene as dirty |
| [`static IsDirty(): boolean`](SceneManager.ts) | Returns true if a scene is dirty |
| [`static ClearDirty(): void`](SceneManager.ts) | Clears the dirty flag. |
| [`static async ExitScene(): Promise<void>`](SceneManager.ts) | Exits the scene. Stops the nitrate engine, clearing the dirty state and waiting for all OnDestroy processes in the engine to finish. |

---

<!-- API_END -->