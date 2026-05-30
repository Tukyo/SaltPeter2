<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [GameObject](../README.md) / Import
<!-- HIERARCHY_END -->
# Import

Internal pipeline for deserialising game objects and blueprints from disk. Wired up by the editor scene — not intended for direct use.

<!-- API_START -->
---

## API

### [`Import`](Import.ts)
 Abstract base for game object import. Subclasses implement Run() to define the import source and target.


---

### [`ImportBlueprint`](ImportBlueprint.ts)
Reads a `.blueprint.json` file and hydrates the target game object
with the deserialised component data.


---

### [`ImportGameObject`](ImportGameObject.ts)
Reads a `.gameobject.json` file and hydrates the target game object
with the deserialised component data.


---

<!-- API_END -->