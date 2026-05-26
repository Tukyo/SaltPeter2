<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [GameObject](../README.md) / Export
<!-- HIERARCHY_END -->
# Export

Internal pipeline for serialising game objects and blueprints to disk. Wired up by the editor scene — not intended for direct use.

<!-- API_START -->
---

## API

### [`Export`](Export.ts)
 Abstract base for game object export. Subclasses implement Run() to define the export target and format.

| Method | Description |
|--------|-------------|
| [`SetGameObjectProvider(fn: () => GameObject \| null): void`](Export.ts) | Sets the function used to retrieve the game object to export. |

---

### [`ExportBlueprint`](ExportBlueprint.ts)
Reads the full simulation texture and writes a `.blueprint.json` asset
and `.meta` file to the Blueprints directory.


---

### [`ExportGameObject`](ExportGameObject.ts)
Reads the current simulation texture within the active selection and writes
a `.gameobject.json` asset and `.meta` file to the GameObjects directory.

| Method | Description |
|--------|-------------|
| [`SetSelectionProvider(fn: () => Rect2D \| null): void`](ExportGameObject.ts) | Sets the function used to retrieve the current selection rect. |
| [`SetAnchorProvider(fn: () => Vec2 \| null): void`](ExportGameObject.ts) | Sets the function used to retrieve the anchor position within the selection. |

---

<!-- API_END -->