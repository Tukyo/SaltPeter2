

<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Rendering](../README.md) / Passes
<!-- HIERARCHY_END -->

<!-- API_START -->
---

## API

### [`CompositePass`](CompositePass.ts)
Final render pass of the forward rendering pipeline.

Reads all populated [`RenderingLayers`](../RenderingLayers.ts) textures and composites them
bottom-to-top using Porter-Duff "over" blending, then outputs the result
to the swapchain texture. Layer order: GOs → Sim.

Created and owned by [`RenderingManager`](../RenderingManager.ts). Do not call directly.


---

### [`GameObjectRenderPass`](GameObjectRenderPass.ts)
Writes GO cell colors into {@link RenderingLayers.gameObjectsTexture} for the FRP GO layer.

One thread per GO slot. Iterates each cell, computes its world position using the same
rotation math as the stamp pass, and writes the cell's material color unconditionally —
no occupancy check. {@link RenderingLayers.gameObjectsTexture} is cleared before this runs
so ghost pixels from previous frames are removed.

Created and owned by [`RenderingManager`](../RenderingManager.ts). Do not call directly.


---

### [`SimulationRenderPass`](SimulationRenderPass.ts)
Resolves the simulation identity texture into RGBA color for the sim layer.

Reads `currentIdentity` and the material visual buffer, writes resolved per-pixel
RGBA into {@link RenderingLayers.simTexture}. Run once per frame before
[`CompositePass`](CompositePass.ts). Does not touch physics, state, or ownership textures.

Created and owned by [`SimulationManager`](../../simulation/SimulationManager.ts). Do not call directly.


---

<!-- API_END -->
