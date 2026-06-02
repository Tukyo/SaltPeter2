# Changelog

---

## [0.0.6] - Patch - 06/01/2026
### Updates & Changes

#### Architecture
- `PingPongTargets` split into two dedicated layer types: `SimulationLayer` (identity, physics, state) and `GameObjectLayer` (identity, physics, state, ownership) — world sim and game objects no longer share a single texture set
- `GameObjectBuffers` moved out of `GameObjectPass.Create` and up to `SimulationManager`, making buffer lifetime match the simulation lifetime instead of the pass
- `SimulationManager` now owns both `simulationLayer` and `gameObjectLayer` as first-class public references

#### Simulation
- `sim.wgsl` ownership early-exit removed — all cells now enter `resolveCellForState` regardless of GO ownership
- GO ownership awareness moved to `phaseResolution.wgsl`: solid and powder intent is blocked from entering GO-owned cells; empty GO-owned cells reject incoming solid/powder and accept only liquid/gas/fire
- `transitionBuffer` removed from both the sim pipeline and `GameObjectBuffers` — transition detection via buffer write/read is gone
- Sim pipeline bindings simplified: `ownershipTexture`, `nextOwnershipTexture`, and `transitionBuffer` (bindings 12–14) replaced with a single read-only `goOwnershipTexture` storage texture (binding 12)
- `PhysicsPass` now dispatches twice per step — once for `simulationLayer`, once for `gameObjectLayer` — giving GO cells temperature and pressure propagation

#### Game Objects
- `GameObjectRenderPass` rearchitected: was one-thread-per-GO iterating cell positions → now pixel-by-pixel over `gameObjectLayer.currentIdentity`, matching the approach used by `SimulationRenderPass`; stateBuffer, cellBuffer, and the per-frame clear encoder are all removed
- `gameObjectRender.wgsl` rewritten accordingly — reads identity texture directly, resolves material color, writes transparent for unoccupied pixels
- Erase pass now calls `GameObjectLayer.ClearNextTextures()` — uses a pre-zeroed GPU buffer to clear next identity and next ownership in one encoder call, replacing the manual clear render pass in `RenderingManager`
- `gameObjectStamp.wgsl` transition detection block removed — stamp no longer reads `transitionBuffer` or kills cells on material change
- `GameObjectCollisionPass` now takes `physicsBuffer` and classifies boundary cells by phase: gas and fire are ignored entirely, liquid cells are accumulated for buoyancy rather than contributing to collision normals
- Buoyancy applied per step: upward velocity proportional to `avgLiquidDensity / state.density * submersionFraction * gravity * buoyancyScale`
- Liquid drag applied per step when submerged: velocity scaled by `1 - submersionFraction * liquidDrag` on both axes
- Sleeping objects wake immediately on any liquid contact
- Near-point contact jitter: when `hitCount <= 2`, a small random lateral impulse is injected to break point-contact balancing instability

#### Config
- `GameObjectConfig.physics.liquid` block added: `buoyancy: 10.0`, `drag: 0.015`
- `KeybindConfig.debug.overlay.layer` added: `down: "["`, `up: "]"` — cycles active debug layer

#### Shaders
- `LayerInteractionPass` and `layerInteraction.wgsl` added — new cross-layer compute pass that runs after both layers swap each step; currently stubs (ownership read plumbing in place, no interaction logic yet)
- `ShaderAssembler.LayerInteraction` assembler method added
- `ShaderAssembler.GameObjectCollision` now includes `MaterialPhysicsEntry` struct and phase constants so the collision shader can classify cell phases
- `ShaderAssembler.GameObjectRender` simplified — no longer generates GO state/cell structs; includes `commonWgsl` for shared identity helpers instead

#### Debug
- `TemperatureOverlay` gains `SetLayerIndex(index)` — when index is 1, reads `gameObjectLayer.currentPhysics` instead of `simulationLayer.currentPhysics`
- `DebugOverlay` gains `[ ]` keybinds to cycle between `Simulation` and `GameObject` debug layers; `CycleLayer`, `GetActiveLayerIndex`, and `GetActiveLayerName` added
- `DebugOverlayBadge` added — small DOM label that displays the active layer name when the temperature overlay is active
- `DebugPanel` hovered-cell inspector gains `< >` layer navigation buttons; `ReadHoveredCell` selects identity, physics, and state textures from the currently selected layer
- `GameObjectOverlay` now reads `gameObjectLayer.currentOwnership` instead of the sim layer ownership texture

#### Materials
- Liquid color alphas adjusted across 14 materials for visual consistency: Acid, Beer, Blood, Brine, Coffee, Diarrhea, Honey, Latte, MoltenPlastic, Oil, Peat, Saltwater, Urine, Vomit

---

## [0.0.5] - Patch - 06/01/2026
### Updates & Changes

#### Rendering
- Replaced the single display pass with a layered forward rendering pipeline: `SimulationRenderPass`, `GameObjectRenderPass`, and `CompositePass`
- Added `RenderingLayers` — owns one GPU texture per renderable layer (`simTexture`, `gameObjectsTexture`); passed by reference to each render pass
- `RenderingManager` now drives three separate encoders per frame (sim render, GO render, composite) and recreates layers on resize

#### Simulation
- `sim.wgsl` now reads ownership texture — owned cells skip movement entirely (other systems are responsible for them)
- When an owned cell's material changes (transition), ownership is released and the new material ID is written to a `transitionBuffer` so the GO stamp pass can react
- Sim pipeline split into three separate command encoder submissions per step: sim+intent, GO erase, GO stamp — ensuring correct ordering across passes
- `SimulationPass` now takes a `transitionBuffer` parameter and binds ownership read/write (bindings 12–14)
- Added `isOwnedCell` and `releaseOwnership` helpers to `common.wgsl`

#### Game Objects
- GO pass split into `RunErase` and `RunStamp` — erase runs before the sim, stamp runs after
- Stamp carry-over now guards on ownership confirmation — GOs no longer reset to resting physics/state values when the previous cell was occupied by a sim cell
- Material transitions now detected in stamp pass via `transitionBuffer` — affected GO cells are marked dead and replaced with a dynamic sim cell
- Dead cell tracking with GPU readback — when all cells in a GO are dead it is destroyed; partial death triggers a collider rebuild
- Pixel body collider rebuilds dynamically as cells are consumed by transitions
- `GameObjectBuffers` gains `transitionBuffer`, `deadCellBuffer`, and `deadCellReadbackBuffer`; constructor now takes sim dimensions for transition buffer sizing
- `GameObjectStateSchema` gains `density` field — average material density uploaded at spawn time

#### Materials
- Added `frozen` and `molten` material tags
- Applied `molten` tag to all existing molten metal variants
- Applied `frozen` tag to Frozen Milk and Frozen Poison
- Adjusted `restingStrength` on molten metals (0.4 → 0.75) and frozen materials to reduce temperature pull
- Adjusted melt temperatures for Frozen Milk (0.435 → 0.45) and Frozen Poison (0.475 → 0.45)
- Lava `restingStrength` increased: 0.5 → 0.8
- Water color alpha reduced to 0.75

#### UI
- Editor panels restructured into left docket (inspector, hierarchy, resources) and right docket (tools), each with an independent collapse toggle button
- UI hide keybind now toggles both dockets independently rather than a single body class
- Added `ToggleListControl` — scrollable toggle list for large option sets
- `ToggleListSetting` type added to `UISetting`
- Materials panel tag filter switched from `ToggleGroupControl` to `ToggleListControl`
- CSS refactored to use CSS custom properties (`--font-ui`, `--font-mono`, `--font-size-*`, `--color-*`) throughout; all hardcoded hex values and font strings replaced

#### Installer
- Added custom NSIS installer page (`build/installer.nsh`) — presents desktop and start menu shortcut options during install; shortcuts are skipped on update
- `electron-builder.yml` updated to include the custom NSIS script
- Auto-updater now shows download progress in the window title bar and taskbar progress indicator; update-downloaded prompt allows deferring restart

---

## [0.0.4] - Patch - 05/30/2026
### Updates & Changes

#### New Materials
- Added `Obsidian` — high-durability solid (durability 14, health 500); melts to lava at 0.9 temperature
- Added `Plastic` — flammable, corrodible solid; melts to `plastic_molten` at 0.785 temperature
- Added `MoltenPlastic` — viscous liquid phase of plastic; burns and corrodes; re-freezes to plastic below 0.6 temperature

#### Materials
- Added `rots_meat` tag — materials that rot meat; applied to: Diarrhea, Poison, Urine, Vomit, Feces, RottenMeat
- Added `extinguishes` tag — materials that put out fire; applied to: Water, Saltwater, Brine, Blood, Milk, Urine
- Added `rusts` tag (causes rust) and renamed old `rusts` to `rustable` (can be rusted); Iron, Steel, and IronPowder updated to `rustable`; Water, Saltwater, and Brine updated to `rusts`
- Adjusted boiling temperatures upward: Water 0.6 → 0.8, Saltwater 0.61 → 0.825, Brine 0.62 → 0.85
- Adjusted Basalt melt temperature: 0.95 → 0.975
- Fixed FlammableGas durability from 0 to 0.01 so reaction rate scaling doesn't divide by zero

#### Reactions System
- Added `MaterialReactionProduct` union type (`MaterialName | 'self'`) — reactions can now declare that one or both products retain the original reagent's material, removing the need to enumerate each reagent explicitly
- `ReactionLookupBuffer` resolves `'self'` at build time by substituting the reagent's own ID, so no WGSL changes are needed per-reaction
- Removed durability scaling from reaction rate baking — rates are now authored as pure probability (`1 / reactionRate`) without multiplying by durability
- Consolidated 5 individual meat-rotting reactions (poison, diarrhea, feces, urine, vomit + meat) into one tag-pair reaction: `rots_meat` + `meat` → `['self', 'meat_rotten']`
- Consolidated 3 rust reactions (water, saltwater, brine + rusts) into one tag-pair reaction: `rusts` + `rustable` → `['self', 'rust']`, rate 100
- Removed separate `meat_rotten + meat` spread reaction
- Added `extinguishes + fire` reaction → `['self', 'smoke']`, rate 1
- Changed lava + water reaction: products `['steam', 'stone']` → `['stone', 'stone']`, rate 45 → 1
- Changed lava + burns reaction: product A changed from `'lava'` → `'self'`
- Changed water + soil reaction: product order corrected to `['self', 'mud']`
- Increased acid + corrodes reaction rate: 0.1 → 0.5

#### Physics & Config
- `PhysicsConfig` velocity block split per-phase: `liquid`, `powder`, and `solid` each have independent `acceleration`, `damping`, and `propagation` values (previously a single shared set)
- `PhysicsConfig` pressure block gains a `weight` object (`lateral`, `vertical`) — previously hardcoded as constants in the shaders
- `ShaderFactory` generates separate WGSL constants per phase: `VELOCITY_ACCELERATION_LIQUID/POWDER/SOLID`, `VELOCITY_DAMPING_*`, `VELOCITY_PROPAGATION_*`; pressure weight constants now sourced from config

#### Shaders
- `reactions.wgsl` rewritten with a two-loop structure — Chebyshev offsets handle fire reactions, cardinal offsets handle all other reactions; fire reactions are kept separate to support fire-specific surface-scaling logic
- Diagonal fire spread now requires at least one cardinal bridge cell to be open, preventing fire from spreading through the corners of solid fuel
- Fuel-catching-fire reactions scale probability by durability and the minimum air exposure of fuel and fire cells; non-fuel fire reactions (e.g. extinguishing) use flat probability with no air scaling
- Reactive neighbor counting scales reaction probability down proportionally when a cell has fewer reactive contacts
- `velocityPropagation.wgsl`: `propagateLiquidVelocity` renamed to `propagateVelocity` and extended to cover liquid, powder, and solid phases; each phase only receives velocity from same-phase neighbors; influence is direction-weighted (dot-product toward receiver) rather than a simple average
- `physics.wgsl` and `sim.wgsl`: velocity acceleration and damping are now selected per-phase via switch statements using the new per-phase constants
- `phaseIntent.wgsl`: gas beneath a liquid or solid now always intends to rise (buoyancy is deterministic; no probability gate)
- `liquidResolution.wgsl`: detects rising gas directly below the liquid cell and performs the swap to allow gas bubbles to push through
- `gasResolution.wgsl`: gas blocked above by liquid falls through to the liquid's position
- `fireResolution.wgsl`: fire now requires both adjacent fuel and adjacent air to sustain; fire cells neighboring only other fire are not treated as fueling each other; extinguishing reactions are excluded from the fuel check
- `diffusion.wgsl`: uses `VELOCITY_ACCELERATION_LIQUID` instead of the removed shared constant
- `common.wgsl`: `displacementHash` inputs changed to `fract(time * 7.3)` / `fract(time * 11.9)` to reduce low-frequency correlation with `timeHash`

### Bug Fixes
- Fixed bug causing higher density liquids to duplicate lower density liquids when passing through them
- Gas bouancy addition fixed bug causing gas to be trapped underneath liquids (acid behaves much better now)

---

## [0.0.3] - Patch - 05/29/2026
### Updates & Changes

#### Simulation
- Added `GameObjectPass` to the simulation pipeline — runs each sim step after the main sim pass, with GPU readback of positions after submit
- Added ownership ping-pong texture pair (`r32uint`) to `PingPongTargets` — R channel stores GameObject ID (0 = unowned); swapped each step via `SwapOwnership()`
- `SimulationManager.Register()` now logs each registered process name with tag `PassRegistry`

#### Shaders
- Static cells no longer have a separate early-return branch in `sim.wgsl` — all cells now flow through `resolveCellForState` regardless of occupancy; static flag is enforced exclusively in the intent pass (no movement generated). This fixes static gas/fire lifetime ticking and dissipation, which were previously bypassed entirely
- Added `timeHash(coord, time)` helper to `common.wgsl` — non-repeating per-cell per-frame hash using irrational multipliers, replaces periodic `fract(time * X)` patterns for solo/death rolls
- Added `displacementHash(coord, time)` helper to `common.wgsl` — same formula as `timeHash`, used for all displacement thickness checks so displacer and displaced cell are guaranteed to agree from one centralized source
- Brush placement refactored to use `instantiateCell` for non-air materials; air placement now explicitly zeroes all textures
- Applied `timeHash` to: gas dissipation roll, fire dissipation roll, all fire intent movement rolls (cling, fall, fire-on-fire spread), liquid velocity-splash roll
- Applied `displacementHash` to: all liquid thickness displacement checks across solid, liquid, powder, gas, and phase intent

#### Debug
- Added `GameObjectOverlay` — new debug layer (F4) that visualizes the ownership texture using golden-angle hue spacing per owner ID, and draws transform gizmos (red X / green Y axes) and sleep-state dots for all active GameObjects
- `DebugOverlay` wires F4 to the new `GameObjectOverlay` layer alongside existing chunk/pressure/temperature overlays
- Added `"GameObject"` and `"PassRegistry"` log tags to `LogManager`

#### Config
- Added `gameObject: 'F4'` debug overlay keybind to `KeybindConfig`
- `GameObjectConfig` added to the engine config barrel export

#### Components
- Added `PixelBodyCollider` component — traces the outermost filled cells of a `PixelData` shape as boundary points; `dirty` flag triggers a rebuild on first frame and on pixel data changes
- Added `ColliderGenerator` — static class with `BuildPixelBodyBoundary`, `BuildBoxBoundary`, and `BuildCircleBoundary` helpers; all boundary point generation routes through here
- `PixelBodyCollider` registered in `ComponentType`, `AnyComponent`, and the definitions barrel export
- `ComponentRegistry` now builds a type-string → constructor lookup map via `GetByType()`, used by the import pipeline to deserialize components by name
- `BoxCollider.size` changed from `Vec2` (`x/y`) to `Size2D` (`width/height`)
- `Rigidbody` gained `BodyTypeValue` static map (Static=0, Dynamic=1, Kinematic=2) for WGSL constant generation, and `isSleeping` field for serialization

#### GameObject
- Added `GameObjectManager` — singleton that owns the active GameObject registry; `Spawn(guid, pos)` resolves a GUID to an asset path, hydrates the object, and sets its spawn position; resets on `OnResize`
- `GameObject.Instantiate(guid, pos)` and `GameObject.Destroy()` added as the public API for spawning and removing objects; both route through `GameObjectManager`
- `Metadata` gained GUID caching via `ResolveGuid()` (scans all resources once, then caches), `GenerateOrPreserve()` (preserves existing GUID on re-export so stable references don't break), and `InvalidateGuidCache()` (called after any export)
- `Export.WriteFile` now takes `type` and `editor` params and calls `GenerateOrPreserve` internally — callers no longer build metadata themselves; cache is invalidated automatically after each write
- `Import.HydrateGameObject` promoted to static; `ReadFile` split into `ReadFileEditor` (instance, editor file picker) and `ReadFile` (static, explicit path); `HydrateFromFile` added as a static convenience combining both
- New GPU buffer and schema types: `GameObjectStateSchema`, `GameObjectCellSchema`, `GameObjectColliderSchema`, `GameObjectBuffers` — single source of truth for buffer layout shared between CPU upload and `ShaderFactory` WGSL struct generation
- `GameObjectPhysicsPass` — integrates Rigidbody velocity and updates positions entirely on GPU each sim step
- `GameObjectCollisionPass` — walks boundary points in parallel (one thread per GO), accumulates collision normals from occupied sim cells and out-of-bounds hits, applies velocity reflection and depenetration

#### UI
- Added `PixelBodyColliderField` — empty inspector field for `PixelBodyCollider` (no editable properties; boundary is auto-generated from pixel data)
- Added `Size2DField` helper to `ComponentField` — labeled W/H input pair; used by `BoxColliderField` to replace the old `Vec2Field` for size
- Added `SliderField` helper to `ComponentField` — clamped range input with live value readout; `RigidbodyField` now uses it for Friction and Bounciness (0–1 range)
- Inspector drag-to-reorder now targets the component header element only, not the entire component card

### Bug Fixes
- Fixed `electron-updater` import — changed named import to default package import with destructuring to resolve module compatibility issue
- Fixed static cells with lifetimes (e.g. static smoke) never dying — they previously bypassed the entire phase resolution pipeline including lifetime ticking and dissipation
- Fixed periodic "wave" pattern in gas and fire dissipation where cells would die in synchronized bursts — caused by shared `fract(time * X)` time offsets in hash inputs
- Fixed periodic wave pattern in liquid splash, fire movement, and displacement decisions for the same reason
- Fixed the "*notch*" issue causing liquids to not fill above convex shapes protruding into enclosures. Currently checking if !isStatic but will improve for a more dynamic check in the future.
- Fixed some material values to be more realistic
- Fixed pressure propagation sampling gravity for distance check. This caused pressure to propagate 9.8 cells instead of just one by one.
- Partially fixed the loss of liquids happening when displaced by other materials.


---

## [0.0.2] - Patch - 05/26/2026
### Updates & Changes
- Added eyedropper tool to the editor (gameobject mode) — hold ALT to sample any material under the cursor, ALT+click applies the material, brush type, and color variant to the active panels
- Added eyedropper tooltip UI with color swatch, material name, and ID
- Added `SetBrushType` and `SetColorVariant` programmatic methods to `BrushPanel`
- Added `SetActiveMaterialById` programmatic method to `MaterialsPanel`
- Added `MaterialQuery.DecodeColorIndex` as the single source of truth for decoding color seed bytes from the identity texture
- `MaterialQuery` is now exported from the materials index
- `BrushPreview` now reads a live `getBoundingClientRect()` each frame instead of caching a stale rect via `ResizeObserver`
- `RenderingPanel` resolution and scale changes now call `NitrateEngine.Resize` directly instead of going through `WindowManager.ScheduleResize`
- Dev console hidden by default, show with F12
- Added changelog to main readme

### Bug Fixes
- Fixed `BrushPreview` position drifting after canvas resize due to stale cached `DOMRect`
- Fixed `ExportBlueprint` and `ExportGameObject` using inconsistent inline color decoding math — both now use `MaterialQuery.DecodeColorIndex`

---

## [0.0.1] - Initial Release - 05/26/2026
