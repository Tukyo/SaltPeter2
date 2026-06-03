

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
Resolves the GameObject layer identity texture into RGBA color for the game objects layer.

Reads `gameObjectLayer.currentIdentity` pixel-by-pixel (including bleed pixels written
by the stamp pass) and writes resolved RGBA into {@link RenderingLayers.gameObjectsTexture}.
Unoccupied pixels write transparent so the composite shows world sim underneath.

Created and owned by [`RenderingManager`](../RenderingManager.ts). Do not call directly.


---

### [`ParticleRenderPass`](ParticleRenderPass.ts)
Resolves live particle positions into RGBA pixels on the particle layer texture.

Clears {@link RenderingLayers.particleTexture} each frame, then dispatches one
thread per particle slot. Active particles scatter-write a single pixel at their
current position, sourcing color from [`ParticleDefinitionBuffer`](../../particle/ParticleDefinitionBuffer.ts) visual params
(material lookup or raw RGBA). Inactive slots are skipped.

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
