# Changelog

---

## [0.1.3] - Patch - [06/07/2026]
### Updates & Changes

#### **Particle System — Overhaul**

- **ParticleSystem Component (New)**
  - `src/engine/component/definitions/particlesystem/` — new `ParticleSystem` component; authors a full particle emitter definition inline on a GameObject (all modules supported)
  - Inspector fields added at `src/engine/ui/fields/particlesystem/` — collapsible module sections, enabled toggles, `RandomBetweenTwo` value pairs, color pickers
  - `GameObjectPass` now detects `ParticleSystem` on GO spawn and registers its definition into `ParticleDefinitionBuffer` via `RegisterDefinition`; `runtimeSlot` records the assigned index

- **Emission Split — Material vs. GameObject Emitters**
  - `particleEmission.wgsl` deleted; replaced by four focused WGSL files:
    - `particleShared.wgsl` — shared structs and helpers used by both emitter passes and simulation
    - `particleSpawn.wgsl` — shared particle spawn logic
    - `particleSubEmitter.wgsl` — sub-emitter trigger logic (Birth / Collision / Death)
    - `particleMaterialEmitter.wgsl` — material-based emission (one thread per sim cell, unchanged behavior)
    - `particleGameObjectEmitter.wgsl` — new; one thread per slot in `ParticleEmitterBuffer`; emits from GO world positions each step
  - `ParticleEmissionPass` split into two pipelines (`materialPipeline` / `gameObjectPipeline`) compiled in parallel; both run back-to-back each sim step
  - `ShaderAssembler.ParticleEmission()` replaced by `ParticleMaterialEmission()` and `ParticleGameObjectEmission()`

- **ParticleEmitterBuffer (New)**
  - `src/engine/particle/ParticleEmitterBuffer.ts` — GPU storage buffer holding per-frame GO emitter state (slot index, world position, delay, duration, loop flag)
  - `SimulationManager` calls `particleEmitterBuffer.Update()` each step, collecting active `ParticleSystem` components from `GameObjectManager`

- **ParticleDefinitionBuffer — Runtime Registration**
  - Now pre-allocates `maxGameObjectEmitters` extra slots (config default 256) beyond the static registry
  - `RegisterDefinition(device, modules)` packs a runtime definition into the next available slot and uploads it via `writeBuffer`
  - `PackDefinition` extracted as a static helper shared by both startup baking and runtime registration

- **Particle Definition Schema Expansion**
  - `ParticleBuffer.FloatsPerParticle`: 8 → 14 (expanded per-particle state for sub-emitter and inherit-velocity data)
  - Definition layout expanded from ~50 to 81 floats per entry; module-by-module field groups with `enabled` flags:
    - `main` [0–7], `emission` [8–10], `visual` [11–20], `shape` [21–29]
    - `velocityOverLifetime` [30–39], `inheritVelocity` [40–42]
    - `colorOverLifetime` [43–59], `noise` [60–70], `collision` [71–75], `subEmitter` [76–80]
  - All range fields now support `RandomBetweenTwo<T>` — both endpoints packed into adjacent slots; WGSL picks one randomly at spawn time

- **New Particle Module — InheritVelocity**
  - `src/engine/particle/modules/InheritVelocityModule.ts` — `mode` (`Initial` / `Current`) and `multiplier`; newly spawned particles inherit the emitter's sim-layer velocity

- **Sub-Emitter Module**
  - Now fully wired: `spawnCondition` (Birth / Collision / Death), `particle` (target definition slot), `probability`, and `inherit` (per-module mask)

- **New Particle Definition — AcidBubble**
  - `src/engine/particle/definitions/AcidBubble.ts` — rising bubble effect for Acid material

- **Particle Simulation**
  - `particleSimulation.wgsl` updated to read expanded particle state (14 floats per particle); handles inherit-velocity initial seed and sub-emitter death trigger

- **Particle Render**
  - `particleRender.wgsl` updated to match expanded particle layout

#### Physics Config — Gas and Fire Velocity Phases
- `PhysicsConfig.velocity` gains dedicated `gas` and `fire` blocks (`acceleration`, `damping`, `propagation`)
- `ShaderFactory.GenerateVelocityConstants()` now emits `VELOCITY_ACCELERATION_GAS/FIRE`, `VELOCITY_DAMPING_GAS/FIRE`, `VELOCITY_PROPAGATION_GAS/FIRE`; physics and sim shaders can now tune gas/fire movement independently

#### Analytics — Dual-Layer Counts
- `Analytics` now runs two separate `AnalyticsPass` instances — one over `simulationLayer.currentIdentity`, one over `gameObjectLayer.currentIdentity`
- `Analytics.Init` now takes `(simPass, goPass)`; `ReadAsync` returns `AnalyticsCounts { simulation, gameObject }` via `Promise.all`
- `AnalyticsMenu` renders two labeled sections (Simulation / GameObject) with an empty-state dash
- `AnalyticsOverlay` passes both identity textures to `Analytics.Run`
- `SimulationManager` creates and registers two analytics passes (`simAnalyticsPass`, `goAnalyticsPass`)

#### GameObjects — Particle-Only GOs
- `GameObjectPass.UploadGameObject` no longer requires `PixelData` — GOs with only a `ParticleSystem` component are registered and emit particles without any cell geometry
- Dynamic cells can now coexist with static cells (previously all-dynamic GOs were immediately assigned slot `-1` and dropped)
- `ExportGameObject` handles the no-`PixelData` case — exports metadata-only without cell capture

#### Import — Component Pruning on Re-Hydrate
- `HydrateGameObject` now removes components present on the in-memory GO but absent from the saved file before patching; prevents stale components (e.g. leftover `PixelData`) from persisting after re-import

#### Editor — Deferred PixelData on First Paint
- New GOs in editor mode now start empty (no `PixelData`) — `PixelData` is added lazily on the first brush stroke via `BrushManager.onFirstPaint` → `EnsurePixelData()`; this allows particle-only GOs to be edited without a mandatory pixel body
- Import confirmation dialog text updated: "Import Object? All unsaved edits will be lost!"
- After a paint import, `SceneManager.MarkDirty()` is called so the unsaved-changes guard fires correctly

#### New UI Control — ColorPickerControl
- `src/engine/ui/controls/ColorPickerControl.ts` — color swatch (`<input type="color">`) with a separate alpha slider and numeric readout; exported from `controls/Index.ts`
- Used by the `ParticleSystem` inspector fields for all color properties

#### New Material — Caramel
- `src/engine/materials/definitions/liquid/Caramel.ts` — viscous liquid phase of melted sugar
- `Sugar` now melts to `caramel` at temperature 0.725 and `burns` tag added

### Bug Fixes
- Fixed a bug causing imported objects in the editor to not re-hydrate with their correct component structure, leaving behind old components from prior edits
- Fixed a bug causing gameobjects without a pixeldata component to not be used during the `GameObjectPass`
- Fixed bugs causing particle definitions to not be fully packed into the GPU

---

## [0.1.2] - Patch - [06/06/2026]
### Updates & Changes

#### Contact Physics — Material Properties
- Added `friction`, `restitution`, and `hardness` to the material contact physics model — exposed per-material and uploaded to GPU; the collision pass now reads these values directly from `physicsMaterials` at each contact point
- Added `flammability` as a dedicated material physics field — replaces `1/durability` as the ignition probability driver in the fire reaction system; `flammability/(1−flammability)` now controls how quickly a material catches fire relative to its surface exposure
- `MaterialPhysicsSchema` and `MaterialPhysicsBuffer` updated with all four new fields; `MaterialPhysics` interface extracted from `MaterialModel.ts` into its own file
- All materials updated with the new contact and flammability values

#### PixelCell Occupancy — Static vs. Dynamic Cells
- `PixelCell` gains `variantId` and `occupancy` fields; `GameObjectCellSchema` extended with both per-cell
- `GameObjectPass.Register` now splits cells by occupancy on spawn:
  - **Static cells** (`occupancy !== 1`) — uploaded to the GO layer as before; participate in physics, collision, and rendering
  - **Dynamic cells** (`occupancy === 1`) — written directly to the sim layer as free particles at spawn; never stamped to the GO layer
  - GameObjects composed entirely of dynamic cells receive slot `-1` and are excluded from the GO pipeline entirely
- `gameObjectStamp.wgsl` now writes `variantId` and actual `occupancy` into identity texture bytes 2–3 (previously always `0.0` and `OCCUPANCY_STATIC`)
- `ExportGameObject` now reads `variantId` (byte 2) and `occupancy` (byte 3) from the identity texture when capturing cells
- `PixelDataRenderer` now resolves variant-specific colors for cells with `variantId > 0`
- `MaterialsPanel` now reads and applies the occupancy choice on initialization so `BrushManager` starts with the correct value

#### Accumulated Mass — GO Load Stacking
- `GameObjectStateSchema.density` renamed to `accumulatedMass`; on spawn it is initialized to the GO's intrinsic mass rather than average material density
- Collision pass now computes `accumulatedMass` each step: scans up to 2 cells above each boundary point for a resting GO and adds that GO's `accumulatedMass` to this GO's own — stacked GOs transfer their full load downward through the stack
- Physics and collision passes (drag, buoyancy, impulses, depenetration) all use `accumulatedMass` in place of `mass`

#### Collision Overhaul — Torque, Material Friction, and Penetration Allowance
- **Off-center torque** — collision and rest-constraint impulses now produce angular acceleration (`rCrossN`) when the contact centroid is offset from the pivot; torque fires on both bounce and rest paths
- **Rolling friction on slopes** — rolling friction projected onto the surface tangent `(−ny, nx)` so it works correctly on any slope; friction limit scales with `abs(ny)` (normal force) so steep surfaces correctly reduce friction
- **Material-sampled friction and hardness** — collision pass reads `friction` and `hardness` from `physicsMaterials` at each sim-cell contact; GO-vs-GO contacts use the other GO's friction; effective friction is the geometric mean of both surfaces
- **Penetration allowance** — depenetration push only fires when `hitFraction > penetrationAllowance` AND the push direction is unoccupied; prevents GOs from being ejected upward through material piled on top
- Removed near-point contact jitter (random lateral impulse on `hitCount ≤ 2`); torque-based balancing now handles unstable point contacts
- `GameObjectConfig` gains `angular.minLeverArm`, `bleed.threshold`, and `collision.depenetration.allowance`
- Collision uniform buffer extended from `16 → 18` f32 slots; `penetrationAllowance` and `minLeverArm` added
- `buoyancyScale` default changed `10.0 → 1.0`; `liquidDrag` changed `0.015 → 0.01`; `settleThreshold` changed `0.001 → 0.0`

#### Bleed Threshold Configurability
- Erase and stamp shaders replaced the hardcoded `0.001` bleed threshold with `uniforms.bleedThreshold`, sourced from `GameObjectConfig.physics.bleed.threshold` (default `0`)

#### Pressure — GO-Aware Propagation
- `pressurePropagation.wgsl` now accounts for GameObjects in the pressure field:
  - A GO cell directly above a sim cell contributes its `accumulatedMass` as pressure (downward load)
  - GO cells beside a sim cell block lateral pressure propagation (treated as solid walls)
- `physics.wgsl` gains bindings 7 (`goOwnershipTexture`) and 8 (`goStateBuffer`) for both sim and GO dispatch passes; `SimulationManager` passes `goStateBuffer` to `PhysicsPass`
- `ShaderFactory.GenerateGameObjectStateConstants()` generates `GO_STATE_STRIDE`, `GO_MASS_OFFSET`, and `GO_ACCUMULATED_MASS_OFFSET` WGSL constants; injected into the physics shader via `ShaderAssembler`

#### Pressure-Driven Powder and Solid Spreading
- `PhysicsConfig.pressure.spread` block added: independent `threshold`, `scale`, and `maxChance` for both powder and solid phases; `stepScale` changed from `0.95 → 0.25`
- `SimulationSchema` now has dedicated `intentUniformFields` (6 additional pressure-spread parameters, separate from `sharedUniformFields`); `IntentPass` uploads them each step
- Powders under sufficient pressure can now spread laterally even on a surface (probabilistic, chance scales with pressure)
- Solids under sufficient pressure can now spread laterally over a grounded surface (probabilistic); new `isValidSolidSurfaceSlideTarget` helper added to `solidIntent.wgsl`

#### Phase Changes
- Fire
  - `fireIntent.wgsl`: `isValidFireGroundedTarget` replaced by `isValidFireTarget` — fire can now target gas-phase cells and any cell adjacent to an occupied neighbor (no longer requires the cell directly below to be solid)
  - New `getAdjacentFuelFlammability` helper returns the highest flammability among all 8 Chebyshev neighbors
  - Fire `surfaceSlideChance` and `lateralSpreadChance` now scale with adjacent fuel flammability: fire moves more aggressively when surrounded by highly flammable material
  - Fire can now spread straight upward (added as an explicit settle target)

- Gas
  - `gasIntent.wgsl` — gas can now rise directly into fire-phase cells (straight-up, diagonal-up); previously blocked by anything that wasn't air

#### Debugging Changes
- `DebugOverlay` badge now shows for all active debug layers (Chunks, Pressure, Temperature, GameObjects) using a `DEBUG_LAYER_LABELS` map; previously only shown for temperature
- Layer cycling (`[ ]` keybinds) moved from `DebugOverlay` into `DebugPanel`, which now owns a `CycleLayer()` method with proper `Input` subscription and `OnDestroy` cleanup
- `DebugOverlay.CycleLayer`, `GetActiveLayerIndex`, and `GetActiveLayerName` removed

- Pressure Overlay
  - `PressureOverlay` now reads both sim and GO physics layers in parallel; per-pixel pressure displayed is `max(simPressure, goPressure)`, so GO-generated pressure is visible in the overlay

- Temperature Overlay
  - `TemperatureOverlay` no longer supports layer switching; `layerIndex`/`SetLayerIndex` removed — always reads from the sim physics layer

### Bug Fixes
- Fixed GO-vs-GO ghost contacts — GOs with `boundaryCount == 0` (all-dynamic cells or slot -1) were still being detected as solid in collision and erase passes; guarded `isOtherGo` checks with `gameObjectStates[cellOwner - 1u].boundaryCount > 0u`
- Fixed liquid density values above `1.0` being uploaded raw — liquid materials with density > 1.0 could cause displacement anomalies; density is now clamped to `1.0` at physics buffer upload
- Fixed fire spreading diagonally through liquids and gases — the bridge-cell blocker check in `reactions.wgsl` was treating liquid/gas cells as solid walls, preventing fire from spreading around water surfaces; liquid/gas cells now excluded from bridge blocking
- Fixed fuel burning probability scaling with `1/durability` — materials with very low durability burned unrealistically fast; probability now uses the dedicated `flammability` field
- Fixed fire sustaining next to liquid/gas neighbors — fire adjacent only to liquid/gas was incorrectly failing its sustain check; liquid/gas cells now count as air exposure in `fireResolution.wgsl`
- Fixed gas being blocked by fire when rising — gas could not displace fire cells directly above; `gasIntent.wgsl` updated to allow rising into fire-phase cells
- Fixed pressure not respecting gravity direction — `computePressure` was receiving the raw signed `gravity` float instead of `getGravityDirection(gravity)`, causing incorrect pressure direction at non-default gravity
- Fixed temperature not averaging correctly when both sim and GO cells occupy the same coordinate — sim temperature was unconditionally preferred; now averaged when both layers report an occupied cell
- Fixed `ExportGameObject` discarding `variantId` and `occupancy` — bytes 2 and 3 from the identity texture were not captured on export; saved GameObjects lost these values entirely
- Fixed a bug causing `molten` tagged materials to not burn `burns` tagged materials 

---

## [0.1.1] - Patch - [06/04/2026]
### Updates & Changes

#### Guides
Added a guides folder with editor related guides. More will be added over time.

#### Input System Overhaul
`Input` has been expanded from a mouse-only tracker into a unified input bus. All engine and editor code now subscribes through `Input` instead of attaching raw DOM listeners directly — so blur-clearing, repeat-suppression, and future guardrails apply universally.

- `InputState` renamed to `MouseState`; `GetState()` renamed to `GetMouseState()`; `Reset()` renamed to `ResetMouseState()`
- `MouseButton` type alias added (`0 | 1 | 2`) for typed button subscriptions
- Keyboard subsystem added: `InitKeyboard()` wires `keydown`/`keyup`/`blur` on `window`; repeat keydown events are suppressed (first press only fires callbacks); `blur` fires all pending keyup callbacks and calls `ResetMouseState()` so no keys stay stuck when the window loses focus
- Subscription API added for all input events — each returns an unsubscribe function:
  - `OnMouseDown(button, cb)` — canvas-level mousedown for a specific button
  - `OnMouseUp(button, cb)` — window-level mouseup (catches drag-releases)
  - `OnMouseMove(cb)` — canvas mousemove
  - `OnKeyDown(key, cb)` — first keydown (repeats ignored)
  - `OnKeyUp(key, cb)` — keyup
- `IsKeyDown(key)` added for polling keyboard state
- `OnDestroy` now removes all registered listeners (`mousemove`, `mousedown`, `mouseleave`, `mouseup`, `keydown`, `keyup`, `blur`)

#### Editor Scripts — Input API Migration
All editor controllers and overlays that previously attached raw DOM listeners have been migrated to the `Input` subscription API.

- `EyedropperController` — removed local `altDown` boolean and raw `window`/`canvas` event listeners; now subscribes via `Input.OnKeyDown/OnKeyUp('Alt')` and `Input.OnMouseDown/OnMouseMove`; `IsKeyDown('Alt')` replaces the local flag throughout
- `SelectionController` — removed local `shiftDown`/`ctrlDown` booleans and raw event listeners; now subscribes via `Input.OnKeyDown/OnKeyUp` for Shift and Control; `IsKeyDown` replaces local flags; `GetMouseState().leftDown` replaces `e.buttons & 1` check
- `AnalyticsOverlay`, `DebugOverlay`, `UserInterfaceManager` — all raw `window.addEventListener('keydown')` calls replaced with `Input.OnKeyDown` subscriptions; `OnDestroy` now calls the returned unsubscribe functions instead of `removeEventListener`
- `BrushManager`, `BrushPreview`, `Camera`, `DebugPanel` — call sites updated from `GetState()` to `GetMouseState()`

### Bug Fixes
- Fixed GameObject instantiation failing for custom assets — `Metadata.ResolveGuid()` previously only scanned shipped resources when building its GUID cache; it now scans both `resources` and `userdata` in parallel, so GOs authored and saved as custom assets can be found and spawned by GUID
- Fixed `Metadata.GenerateOrPreserve()` silently discarding existing GUIDs for custom assets — now reads the `.meta` file directly via `window.api.assets.read()` and parses inline, instead of routing through `Metadata.Read()` which did not fall back to the userdata path in this context

---

## [0.1.0] - Minor - [06/03/2026]
### Updates & Changes

**The GameObject system is live!** Try it out with one of the pre-authored GameObjects or make your own and drop them into the sandbox! All you need to do is drag and drop any GameObject from the resources panel to where you want it placed in the Sandbox scene! Enjoy!

*All UserData is now saved to /Documents/SaltPeter, this is where your custom assets live.*

#### Floating Panel UI System
The UI layout has been completely rearchitected. Panels are no longer fixed inside left/right docked columns — they now float freely on a full-screen canvas and can be dragged, resized, and arranged freely.

- `UserInterfaceManager` — replaced fixed left/right docket layout with a single `#ui-layer` div; all panels mount as `position: absolute` children; old `left-docket`, `right-docket`, `tools-docket`, `inspector-docket`, `hierarchyDocket`, `resourcesDocket` elements removed entirely
- `CollapsiblePanel` — upgraded with drag-to-reposition (header drag), left and right corner resize handles (SVG icons), height stash/restore on collapse, and panel-to-panel snap alignment; collapse now pushes sibling panels in the same column downward (`PushPanelsInColumn`); panels that would go offscreen wrap to an adjacent column
- `UserInterfaceConfig` (new) — centralized default positions, sizes, and collapsed states for every panel type; individual panels can override via `style` and `collapsed` constructor params
- `Hierarchy` and `Inspector` converted from custom containers into `CollapsiblePanel` instances; legacy `hierarchy-header/title` and `inspector-header/title` CSS removed
- `BrushPanel`, `DebugPanel`, `MaterialsPanel`, `RenderingPanel`, `ScenePanel`, `SimulationPanel` — all now accept `style` and `collapsed` constructor params, defaulting from `UserInterfaceConfig`
- `style.css` — docket column styles removed; `.ui-panel` now uses `position: absolute`; resize handle styles and dragging cursor states added; `.toggle-list` scrolling changed to flex-based (removed `max-height: 75px` cap)

#### Resources Panel — Shipped + Custom Assets
The Resources browser now distinguishes between read-only shipped assets and user-authored custom assets, backed by a new `userdata` IPC channel.

- Resources panel now renders two root sections: **Shipped** (read-only in production, lock icon badge, import only) and **CustomAssets** (full CRUD, userdata API)
- File selection added — clicking a file highlights it and notifies the `ResourcesPreviewPanel`
- Per-section drag-and-drop: items and folders cannot be dragged across sections
- Context menus (rename, delete, new folder) only shown on the userdata section in production; always shown in dev
- `.meta` files now moved and deleted automatically alongside their parent asset
- `InvalidateFile()` public method added — called after export to refresh the icon strip without a full re-render
- Cache keys namespaced as `u:path` / `r:path` to prevent collisions between sections
- Poll now fetches both shipped and userdata paths and hashes them together for change detection

#### Resources Preview Panel (new)
- `src/engine/ui/panels/ResourcesPreviewPanel.ts` — new `CollapsiblePanel`-based panel that renders a pixel-art preview of the selected resource using `PixelDataRenderer`
- Shows filename label; scales to fit a 72 px target; shows a placeholder SVG when no `PixelData` component is found
- Created and managed by `Resources`; params forwarded as a `previewPanel` option on `ResourcesParams`

#### PixelDataRenderer
- `src/engine/component/PixelDataRenderer.ts` — standalone 2D canvas renderer for `PixelCell[]` data
- Uses `MaterialQuery.GetById` and material color variants; renders via 2D canvas fill rects scaled to a given pixel size
- Used by both `ResourcesPreviewPanel` and `GameObjectPlacementController`

#### Drag-to-Place GameObjects (Sandbox)
- `src/game/scene/sandbox/scripts/GameObjectPlacementController.ts` (new) — listens for `resource-drag-start` custom events from the Resources panel
- Loads the `PixelData` component from the dragged asset and renders an animated drag preview that follows the cursor and tilts based on horizontal velocity, settling back to upright when the cursor stops
- On drop onto the simulation canvas: reads metadata GUID, converts client coordinates to sim coordinates (Y-flipped), calls `GameObject.Instantiate`
- Wired into `SandboxScene`; `Resources` panel enabled in sandbox with `GameObjectPlacementController` registered

#### Electron IPC Refactor
- Monolithic IPC handlers extracted from `electron/main.ts` into three dedicated modules:
  - `electron/ipc/saves.ts` — save slot read/write/exists/delete
  - `electron/ipc/resources.ts` — shipped resources CRUD (read-only in production)
  - `electron/ipc/userdata.ts` — user custom assets CRUD; `userdata:label` returns the folder basename
- Saves now stored at `~/Documents/SaltPeter/Saves/` (previously stored in Electron's `userData` path)
- Custom assets stored at `~/Documents/SaltPeter/CustomAssets/`; `Blueprints/` and `GameObjects/` subdirectories auto-created on startup via `warmUserDirectories()`
- `preload.ts` exposes `api.userdata` and `api.assets`; `api.assets` is a virtual bridge that routes to `resources` in dev and `userdata` in production
- `vite-env.d.ts` updated with full type declarations for `userdata` and `assets`

#### Export / Import — Userdata Aware
- `Export.WriteFile()` now uses `window.api.assets` so exports always go to the correct location per environment
- `Import.ReadFile()` and the import path now try resources first then fall back to userdata
- `Metadata.Read()` falls back to userdata if a `.meta` file is not found in resources
- After a successful export, `Resources.Instance?.InvalidateFile()` is called to refresh the icon strip

#### Save Path Cleanup
- `DataPersistenceManager` slot names changed from `save_XX` to `Save_XX`
- World metadata path now config-driven via `WorldConfig.save.worldPath` (default `World`)
- Chunk binary path now config-driven via `WorldConfig.save.chunkPath(cx, cy)` (default `Chunks/chunk_X_Y.bin`)

#### Removed Files
- Deleted 6 legacy test gameobject files and their `.meta` files: `CircleTest`, `CubeTest`, `GunpowderTest`, `LavaTest`, `PhysicsTest`, `StoneTest`

---

## [0.0.7] - Patch - [06/02/2026]
### Updates & Changes

#### Particles!
The particle system here mimics Unity's modular particle system. Each particle emitter can have varied modules and produces effects for the materials they are associated with.

- `src/engine/config/ParticleConfig.ts` — particle system performance config (`maxParticles`, `maxParticlesPerMaterial`)
- `src/engine/particle/ParticleBuffer.ts` — flat GPU storage buffer for all live particle state
- `src/engine/particle/ParticleDefinitionBuffer.ts` — per-material particle definition buffer uploaded from authoring data
- `src/engine/particle/ParticleSourceLookupBuffer.ts` — lookup table mapping material IDs to particle definition ranges
- `src/engine/particle/ParticleSchema.ts` — byte layout constants for particle definition fields
- `src/engine/particle/ParticleEmissionPass.ts` — GPU compute pass that spawns particles from emitter sources each sim step
- `src/engine/particle/ParticleSimulationPass.ts` — GPU compute pass that integrates particle physics, applies gravity/VOL/noise, and handles collision response
- `src/engine/shaders/particle/particleEmission.wgsl` — emission shader: samples emitter positions, distributes velocities by cone/angle mode, writes to particle buffer
- `src/engine/shaders/particle/particleSimulation.wgsl` — simulation shader: gravity, `VelocityOverLifetime`, noise perturbation, collision response, kill on speed threshold
- `src/engine/shaders/particle/particleRender.wgsl` — render shader: one thread per particle, resolves material color, writes to particle layer texture
- `src/engine/rendering/passes/ParticleRenderPass.ts` — dispatches the particle render shader each frame; owns the pipeline
- Full particle simulation pipeline wired into `SimulationManager`: `ParticleEmissionPass` and `ParticleSimulationPass` run each sim step; `ParticleRenderPass` runs each render frame
- `RenderingLayers` gains `particleTexture` — a dedicated `rgba8unorm` layer for composited particle output
- `RenderingManager` drives `ParticleRenderPass` and submits its encoder between GO and composite passes
- `composite.wgsl` updated: layer order is now GO → sim → particles (particles render on top of all simulation content); binding 3 added for `particleTexture`
- `ShaderAssembler` — `LayerInteraction` region replaced with `ParticleEmission`, `ParticleSimulation`, and `ParticleRender` assembly methods
- `ShaderFactory` — `GenerateParticleWorkgroupSize`, `GenerateParticleConstants`, `GenerateParticleEmissionUniformStruct`, `GenerateParticleSimulationUniformStruct` added
- Added particle effects to multiple materials

#### Game Objects
- `gameObjectStamp.wgsl` — stamp pass now performs transition and reaction checks inline per cell:
  - Phase transition: if a GO cell's temperature crosses its material threshold, the cell is marked dead and ejected into the sim layer as a dynamic cell
  - Reactions: GO cells participate in `checkReactions` against neighboring sim cells; on a match the cell is ejected as the reaction product
  - Bleed corners (X/Y/diagonal overlap cells) demoted to `stampBleedAt` — writes identity and ownership only, no physics or state, preventing double-stamping physics data into fractional coverage pixels
- `GameObjectPass` — now accepts `reactionBuffer` and passes it to the stamp bind group; stamp uniform buffer extended with `deltaTime` and `time` fields (required by reaction and transition checks); bindings 12–19 wired: `simulationLayer.nextIdentity`, `materialPhysicsBuffer`, `materialStateBuffer`, `simulationLayer.nextPhysics`, `simulationLayer.nextState`, `simulationLayer.currentIdentity`, `reactionBuffer`, `gameObjectLayer.currentIdentity`
- `GameObjectPass` now implements `SimulationResource` (`Destroy()`) — consistent with all other registered passes
- `SimulationManager` wires `reactionBuffer` into `GameObjectPass.Create`

#### Cross-Layer Temperature
- `physics.wgsl` — two new bindings: `crossIdentityTexture` (binding 5) and `crossPhysicsTexture` (binding 6); the physics pass now receives the opposing layer's identity and physics textures so temperature can transfer across sim↔GO boundaries
- `temperaturePropagation.wgsl` — `sampleNeighborTemp()` helper added: prefers the primary layer's temperature at a given coord; falls back to the cross-layer when the primary cell is air; `propagateTemperature` uses it for all four cardinal neighbors so GO cells and sim cells exchange heat naturally

#### Reactions
- `reactions.wgsl` — `sampleNeighborState()` helper added: returns the sim identity state if occupied, otherwise falls back to the GO identity texture (binding `goIdentityTexture`); all neighbor lookups in `checkReactions` now use this helper so sim cells can react with adjacent GO material cells

#### Simulation
- `sim.wgsl` — removed `if moveDir.y != 0.0` gate from the velocity seeding block; all new arrivals now update `finalVx/Y` from `moveDir * accel` regardless of direction; previously pure lateral movement (water sliding sideways) did not contribute to `vx`, leaving horizontal velocity near zero and making the velocity signal unreliable
- `phaseResolution.wgsl` — fire cells can no longer enter GO-owned cells (previously only liquid/gas were exempt from the GO ownership block); GO-owned cells also no longer accept incoming fire from intent

#### Liquid Flow Coupling for Game Objects
- `gameObjectCollision.wgsl` — liquid boundary hits now sample `simPhysicsTexture` (binding 6, `texture_2d<f32>`) to read each cell's `vx`/`vy`; velocity is accumulated and averaged across all submerged boundary points; drag formula changed from `velX *= (1 - drag)` (pull toward zero) to `velX += (avgLiquidVelX * scale - velX) * drag` (pull toward scaled liquid velocity) — GOs now get carried by currents instead of just being slowed in still water
- `GameObjectCollisionPass` — adds `simulationLayer.nextPhysics` as binding 6; uniform buffer extended with `liquidVelocityScale` at slot 15
- `GameObjectConfig.physics.liquid.velocityScale` added (`100.0`) — amplifies the small sim-level velocity signal before applying drag coupling; tune down from 100 once flow feel is calibrated
- `GameObjectBuffers` — collision uniform buffer size `15 * 4 → 16 * 4`
- `ShaderFactory` — `liquidVelocityScale: f32` added to `GameObjectCollisionUniforms` struct

#### Config
- `GameObjectConfig.physics.liquid.velocityScale: 100.0` added
- `PhysicsConfig.velocity.liquid.acceleration` — unchanged at `0.02`; note: with lateral velocity seeding now active, the effective steady-state `vx = accel / (1 - damping) = 1.0 (MAX)` — tune `acceleration` down if liquid flows too directionally

#### Architecture
- `SimulationManager` — `processes` array typed as `SimulationResource[]`; `OnDestroy` calls `p.Destroy()` instead of `p.OnDestroy?.()` (interface normalized across all registered passes)
- `GameObjectPassUniforms` struct (`ShaderFactory`) gains `deltaTime` and `time` fields with padding alignment fix (`pad0`, `pad1`, `pad2`)
- `PhysicsPass` — both sim-layer and GO-layer dispatches now bind the opposing layer's identity and physics textures (bindings 5–6) to supply `crossIdentityTexture`/`crossPhysicsTexture`
- `SimulationPass` — binding 13 added (`gameObjectLayer.currentIdentity`) to supply `goIdentityTexture` to `reactions.wgsl`
- Barrel exports updated: `ParticleConfig` → `config/Index.ts`; `ParticleRenderPass` → `rendering/passes/Index.ts`; `LayerInteractionPass` removed from `simulation/Index.ts`

#### Removed Files
- `src/engine/simulation/LayerInteractionPass.ts` — removed (was the stub added in 0.0.6: *"new cross-layer compute pass that runs after both layers swap each step; currently stubs (ownership read plumbing in place, no interaction logic yet)"*)
- `src/engine/shaders/shared/layerInteraction.wgsl` — removed alongside `LayerInteractionPass`

#### Materials
- `MaterialSimulation` gas baking — `upwardRiseChance` capped at `0.25` (was `1.0`); `diagonalRiseChance` coefficient reduced from `0.6 → 0.25`; `lateralSpreadChance` coefficient reduced from `1.8 → 1.15`; gas spreads and rises less aggressively

### Bug Fixes
- Fixed bug causing temperature misreads in the GameObject layer
- `BrushManager` — now calls `brushPass.Destroy()` before nulling on teardown (was leaking the GPU uniform buffer)
- Fixed a bug causing horizontal velocity in particles to not accurately reflect its true velocity or propagate to neighbor pixels

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
