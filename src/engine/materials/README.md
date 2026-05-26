<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Materials
<!-- HIERARCHY_END -->

# Materials

The material system has three layers: **[definitions](definitions/README.md)** (what materials are), **buffers** (how they're packed and uploaded to the GPU), and **schemas** (the field layouts that keep buffers and WGSL structs in sync).

[`MaterialRegistry`](MaterialRegistry.ts) is the entry point — it auto-discovers all definition files via `import.meta.glob` so no manual registration is ever needed. Every buffer reads from it at startup, packs its slice of material data into a flat `Float32Array` indexed by material id, and uploads it as an immutable `STORAGE` buffer. The matching schema class is the single source of truth for that buffer's field layout, consumed by both the buffer (packing order) and [`ShaderFactory`](../shaders/ShaderFactory.ts) (WGSL struct generation).

[`MaterialQuery`](MaterialQuery.ts) sits on top for runtime reads — phase/tag filtering for UI dropdowns and brush selectors without touching the GPU buffers directly.

<!-- API_START -->
---

## API

### [`MaterialPhysicsBuffer`](MaterialPhysicsBuffer.ts)
GPU storage buffer containing per-material physics data for every registered material.

Built once at startup from [`MaterialRegistry`](MaterialRegistry.ts) — iterates every material definition,
packs phase id, density, durability, temperature parameters, and all transition thresholds
into a flat `Float32Array` indexed by material id, then uploads it as an immutable
`STORAGE` buffer. Layout is defined by [`MaterialPhysicsSchema`](MaterialPhysicsSchema.ts).


---

### [`MaterialPhysicsSchema`](MaterialPhysicsSchema.ts)
Declares the ordered field layout for the per-material physics GPU buffer.

The field list drives both [`MaterialPhysicsBuffer`](MaterialPhysicsBuffer.ts) (which packs the data) and
[`ShaderFactory`](../shaders/ShaderFactory.ts) (which emits the matching WGSL struct), so both sides stay in sync
from a single source of truth.


---

### [`MaterialQuery`](MaterialQuery.ts)
 Helpers for reading and filtering materials.

| Interfaces & Types |
|--------------------|
```ts
interface MaterialFilter {
    phases?: string[];
    tags?: string[];
}
```

| Method | Description |
|--------|-------------|
| [`static GetPhaseOptions(): ReadonlyArray<{ value: string; label: string }>`](MaterialQuery.ts) | Returns all unique non-air material phases, formatted as value/label pairs. |
| [`static GetTagOptions(): ReadonlyArray<{ value: string; label: string }>`](MaterialQuery.ts) | Returns all unique non-air material tags, formatted as value/label pairs. |
| [`static GetFilteredOptions(filter: MaterialFilter): ReadonlyArray<{ value: number; label: string }>`](MaterialQuery.ts) | Filters non-air materials by phase and tag requirements, then returns them as sorted value/label pairs. |

---

### [`MaterialRegistry`](MaterialRegistry.ts)
Auto-discovers and indexes every material definition in the `definitions/` directory.

Uses `import.meta.glob` to eagerly load all `.ts` files under `definitions/`, then
walks every export looking for objects with `name` and `id` properties. No manual
registration is needed — adding a definition file is enough.


---

### [`MaterialSimulation`](MaterialSimulation.ts)
Compiles high-level phase behavior parameters into GPU-ready simulation values.

Each `Compute*` method takes the authored tunable params from a material definition
and derives the concrete probability and rate fields consumed by the WGSL shaders.
Called once per material at buffer build time — not at runtime.


---

### [`MaterialSimulationBuffer`](MaterialSimulationBuffer.ts)
GPU storage buffer containing per-material simulation values for every registered material.

Built once at startup — compiles each material's phase behavior through [`MaterialSimulation`](MaterialSimulation.ts),
packs the resulting simulation fields into a flat `Float32Array` indexed by material id, and
uploads it as an immutable `STORAGE` buffer. Layout is defined by [`MaterialSimulationSchema`](MaterialSimulationSchema.ts).


---

### [`MaterialSimulationSchema`](MaterialSimulationSchema.ts)
Single source of truth for per-phase simulation field layouts and movement intent constants.

Consumed by [`MaterialSimulationBuffer`](MaterialSimulationBuffer.ts) (data packing) and [`ShaderFactory`](../shaders/ShaderFactory.ts)
(WGSL struct generation) so both sides stay in sync. Owns the schema, not the data.


---

### [`MaterialStateBuffer`](MaterialStateBuffer.ts)
GPU storage buffer containing per-material default state for every registered material.

Built once at startup — packs each material's initial `health` and `lifetime` into a flat
`Float32Array` indexed by material id, then uploads it as an immutable `STORAGE` buffer.
Layout is defined by [`MaterialStateSchema`](MaterialStateSchema.ts).


---

### [`MaterialStateSchema`](MaterialStateSchema.ts)
Declares the ordered field layout for the per-material state GPU buffer.

The field list drives both [`MaterialStateBuffer`](MaterialStateBuffer.ts) (which packs the data) and
[`ShaderFactory`](../shaders/ShaderFactory.ts) (which emits the matching WGSL struct), so both sides stay in sync
from a single source of truth.


---

### [`MaterialVisualBuffer`](MaterialVisualBuffer.ts)
GPU storage buffer containing per-material color data for every registered material.

Built once at startup — packs each material's four base colors and any variant color sets
into a flat `Float32Array` (RGBA normalized to 0–1), indexed by material id. Uploaded as
an immutable `STORAGE` buffer. Layout is defined by [`MaterialVisualSchema`](MaterialVisualSchema.ts).


---

### [`MaterialVisualSchema`](MaterialVisualSchema.ts)
Declares the color buffer layout constants for per-material visual data.

Drives both [`MaterialVisualBuffer`](MaterialVisualBuffer.ts) (data packing) and [`ShaderFactory`](../shaders/ShaderFactory.ts)
(WGSL struct generation) so both sides stay in sync from a single source of truth.


---

### [`ReactionLookupBuffer`](ReactionLookupBuffer.ts)
GPU storage buffer containing a flattened N×N reaction lookup table for every material pair.

Built once at startup from `Reactions` — resolves each reaction's reagents (by name
or tag) into material id pairs, then writes product ids, reaction rate, biproduct id, and
neighbor mask into a `Float32Array` at index `[idA * count + idB]`. Reactions are registered
bidirectionally so `A + B` and `B + A` are both populated. Unfilled entries default to `-1`.
The reaction rate is stored pre-inverted and scaled by reagent durability for GPU efficiency.


---

<!-- API_END -->

<!-- TABLE_OF_CONTENTS_START -->
## Table of Contents

[`definitions/`](definitions/README.md)  

<!-- TABLE_OF_CONTENTS_END -->
