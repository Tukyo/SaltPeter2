<!-- HIERARCHY_START -->
[Nitrate](../README.md) / GameObject
<!-- HIERARCHY_END -->
# GameObject

Named scene entities composed from modular components. Game objects are the primary unit of scene authorship — each carries an id, a name, and a collection of components that define its data and behaviour.

Assets are saved and loaded through the export and import subdirectories.

<!-- API_START -->
---

## API

### [`GameObject`](GameObject.ts)
Named container that holds a collection of components defining its behaviour and data.

```ts
const obj = new Nitrate.GameObject(id, 'Player');
const transform = obj.AddComponent(Transform);
```

| Method | Description |
|--------|-------------|
| [`AddComponent(Component: new () => T): T`](GameObject.ts) | Creates and attaches a new component of the given type. Returns the new instance. |
| [`GetComponent(Component: new () => T): T \| null`](GameObject.ts) | Returns the first attached component of the given type, or null if none exists. |
| [`RemoveComponent(Component: new () => T): void`](GameObject.ts) | Detaches and removes all components of the given type. |

---

### [`Metadata`](Metadata.ts)
 Utility class for reading, writing, and generating asset .meta files.


---

<!-- API_END -->

<!-- TABLE_OF_CONTENTS_START -->
## Table of Contents

[`export/`](export/README.md)  
[`import/`](import/README.md)  

<!-- TABLE_OF_CONTENTS_END -->
