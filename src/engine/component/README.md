<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Component
<!-- HIERARCHY_END -->

# Component
Modular data attached to game objects.

Each component definition carries a typed payload (transform, rigidbody, collider, pixel data, blueprint) that the engine reads during simulation and export. The registry auto-discovers all definitions at startup.

<!-- ICONS_START -->
![Blueprint](definitions/blueprint/icon.png) ![Box Collider](definitions/collider/boxcollider/icon.png) ![Circle Collider](definitions/collider/circlecollider/icon.png) ![Pixeldata](definitions/pixeldata/icon.png) ![Rigidbody](definitions/rigidbody/icon.png) ![Transform](definitions/transform/icon.png)
<!-- ICONS_END -->

<!-- API_START -->
---

## API

### [`Component`](Component.ts)
 Shared base for all component types.

| Interfaces & Types |
|--------------------|
```ts
type ComponentType =
    | 'Transform'
    | 'Rigidbody'
    | 'BoxCollider'
    | 'CircleCollider'
    | 'PixelData'
    | 'Blueprint';
```


---

### [`ComponentRegistry`](ComponentRegistry.ts)
 Auto-discovers and registers all component definitions from the definitions directory.


---

<!-- API_END -->