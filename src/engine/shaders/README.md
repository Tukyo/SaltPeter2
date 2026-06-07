<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Shaders
<!-- HIERARCHY_END -->

# Shaders
The shader pipeline has two layers: **generated fragments** and **raw WGSL source files**.

[`ShaderFactory`](ShaderFactory.ts) generates WGSL fragments at startup from live TypeScript data — material counts, phase constants, simulation structs, uniform layouts — keeping GPU structs in sync with their TypeScript counterparts without duplication.

[`ShaderAssembler`](ShaderAssembler.ts) stitches factory fragments with raw WGSL files into complete programs, one method per pass. Pass constructors call these — nothing else should.

<!-- SHADERS_START -->
## Shader Files

| Folder | Files |
|--------|-------|
| `analytics/` | [`analytics`](analytics/analytics.wgsl) |
| `brush/` | [`brush`](brush/brush.wgsl), [`brushOutput`](brush/brushOutput.wgsl) |
| `diffusion/` | [`diffusion`](diffusion/diffusion.wgsl) |
| `game_object/` | [`gameObjectCollision`](game_object/gameObjectCollision.wgsl), [`gameObjectErase`](game_object/gameObjectErase.wgsl), [`gameObjectPhysics`](game_object/gameObjectPhysics.wgsl), [`gameObjectStamp`](game_object/gameObjectStamp.wgsl) |
| `instantiation/` | [`instantiateCell`](instantiation/instantiateCell.wgsl) |
| `particle/` | [`particleGameObjectEmitter`](particle/particleGameObjectEmitter.wgsl), [`particleMaterialEmitter`](particle/particleMaterialEmitter.wgsl), [`particleShared`](particle/particleShared.wgsl), [`particleSimulation`](particle/particleSimulation.wgsl), [`particleSpawn`](particle/particleSpawn.wgsl), [`particleSubEmitter`](particle/particleSubEmitter.wgsl) |
| `phase/` | [`phase`](phase/phase.wgsl), [`phaseIntent`](phase/phaseIntent.wgsl), [`phaseResolution`](phase/phaseResolution.wgsl) |
| `phase/fire/` | [`fireIntent`](phase/fire/fireIntent.wgsl), [`fireResolution`](phase/fire/fireResolution.wgsl), [`fireSimulation`](phase/fire/fireSimulation.wgsl) |
| `phase/gas/` | [`gasIntent`](phase/gas/gasIntent.wgsl), [`gasResolution`](phase/gas/gasResolution.wgsl), [`gasSimulation`](phase/gas/gasSimulation.wgsl) |
| `phase/liquid/` | [`liquidIntent`](phase/liquid/liquidIntent.wgsl), [`liquidResolution`](phase/liquid/liquidResolution.wgsl), [`liquidSimulation`](phase/liquid/liquidSimulation.wgsl) |
| `phase/powder/` | [`powderIntent`](phase/powder/powderIntent.wgsl), [`powderQueries`](phase/powder/powderQueries.wgsl), [`powderResolution`](phase/powder/powderResolution.wgsl), [`powderSimulation`](phase/powder/powderSimulation.wgsl), [`powderTargeting`](phase/powder/powderTargeting.wgsl) |
| `phase/solid/` | [`solidIntent`](phase/solid/solidIntent.wgsl), [`solidResolution`](phase/solid/solidResolution.wgsl), [`solidSimulation`](phase/solid/solidSimulation.wgsl) |
| `physics/` | [`physics`](physics/physics.wgsl), [`pressurePropagation`](physics/pressurePropagation.wgsl), [`temperaturePropagation`](physics/temperaturePropagation.wgsl), [`transitions`](physics/transitions.wgsl), [`velocityPropagation`](physics/velocityPropagation.wgsl) |
| `shared/` | [`common`](shared/common.wgsl), [`displacement`](shared/displacement.wgsl), [`identity`](shared/identity.wgsl), [`identityQueries`](shared/identityQueries.wgsl), [`intent`](shared/intent.wgsl), [`intentRead`](shared/intentRead.wgsl) |
| `sim/` | [`intent`](sim/intent.wgsl), [`reactions`](sim/reactions.wgsl), [`sim`](sim/sim.wgsl) |
| `visual/` | [`composite`](visual/composite.wgsl), [`display`](visual/display.wgsl), [`gameObjectRender`](visual/gameObjectRender.wgsl), [`particleRender`](visual/particleRender.wgsl), [`simRender`](visual/simRender.wgsl) |

<!-- SHADERS_END -->

<!-- API_START -->
---

## API

### [`ShaderAssembler`](ShaderAssembler.ts)
Assembles complete WGSL programs for each simulation pass.

Combines [`ShaderFactory`](ShaderFactory.ts) generated fragments with raw WGSL source files into
full shader strings, one method per pass. Called by pass constructors — not intended
for direct use.


---

### [`ShaderFactory`](ShaderFactory.ts)
Generates WGSL source fragments from live TypeScript data.

Reads material schemas, config, and registry values to emit WGSL constants,
structs, and helpers. Output is concatenated by [`ShaderAssembler`](ShaderAssembler.ts) — not
intended for direct use.


---

<!-- API_END -->