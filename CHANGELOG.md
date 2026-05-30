# Changelog

---

## [0.0.4] - 05/29/2026
### Updates & Changes

### Bug Fixes

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
