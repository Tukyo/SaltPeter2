<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Simulation
<!-- HIERARCHY_END -->
# Simulation

The simulation module runs the GPU compute pipeline each frame. [`SimulationManager`](SimulationManager.ts) is the entry point — it owns all passes, textures, and material buffers, and coordinates their execution order.

Each frame runs four passes in sequence: **intent** (per-cell movement decision), **simulation** (movement resolution and reactions), **diffusion** (pressure spread), and **physics** (temperature, pressure, and velocity propagation). Each pass reads from the `current*` textures in [`PingPongTargets`](PingPongTargets.ts) and writes to `next*`; the manager swaps after each pass.

Runtime settings live in [`SimulationState`](SimulationState.ts), accessible via `SimulationManager.Instance.state`. Pause, speed, and resolution are the primary external controls.

## Texture Layers

| Layer | Format | R | G | B | A |
|-------|--------|---|---|---|---|
| Identity | `rgba8unorm` | Material ID | Color | Variant | Occupancy |
| Physics | `rgba32float` | Temperature | Pressure | Velocity X | Velocity Y |
| State | `rgba32float` | Health | Lifetime | — | — |


<!-- API_START -->
---

## API

### [`BrushPass`](BrushPass.ts)
GPU compute pass that writes brush strokes into the simulation texture.

Created and owned by [`SimulationManager`](SimulationManager.ts). Each frame, [`BrushManager`](../brush/BrushManager.ts) calls
`Run()` via the manager — not directly.


---

### [`DiffusionPass`](DiffusionPass.ts)
GPU compute pass that runs pressure diffusion across the simulation texture.

Created and owned by [`SimulationManager`](SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`IntentPass`](IntentPass.ts)
GPU compute pass that determines per-cell movement intent for the current frame.

Created and owned by [`SimulationManager`](SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`LayerInteractionPass`](LayerInteractionPass.ts)
GPU compute pass that handles cross-layer interactions between the world simulation
and game object layers.

Runs after both layers have finished simulating and swapped each step. Dispatches
over GameObject layer dimensions — only GameObject-owned pixels are processed.

Created and owned by [`SimulationManager`](SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`PhysicsPass`](PhysicsPass.ts)
GPU compute pass that runs temperature, pressure, and velocity propagation.

Created and owned by [`SimulationManager`](SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`SimulationClock`](SimulationClock.ts)
Fixed-timestep accumulator for the simulation loop.

Each frame, `Update` computes delta time, accumulates it scaled by tick rate and sim speed,
and returns the number of whole simulation steps to run. Caps accumulation to prevent
spiral-of-death on slow frames.


---

### [`SimulationInitializer`](SimulationInitializer.ts)
Seeds physics textures on all layers with air's resting temperature
so all cells start at ambient rather than absolute zero.


---

### [`SimulationLayer`](SimulationLayer.ts)
Double-buffered GPU texture pairs for the simulation layer.

Each pass reads from `current*` and writes to `next*`. Call the corresponding
`Swap*` method after each pass to advance the buffer for the next frame.


---

### [`SimulationManager`](SimulationManager.ts)
Central coordinator for the GPU simulation pipeline.

On `Start`, allocates all ping-pong textures, material buffers, and GPU compute passes,
then emits the init event so dependent systems can bind.

Each frame, `Update` drives the fixed-timestep clock and dispatches intent,
simulation, diffusion, and physics passes in order.

```ts
new Nitrate.SimulationManager();
```

| Method | Description |
|--------|-------------|
| [`Block(): void`](SimulationManager.ts) | Prevents the simulation from starting or ticking. Call Unblock() to resume. |
| [`Unblock(): void`](SimulationManager.ts) | Resumes the simulation after a Block() call. |
| [`Debounce(frames: number): void`](SimulationManager.ts) | Pauses the simulation for n frames. |

---

### [`SimulationPass`](SimulationPass.ts)
GPU compute pass that resolves per-cell movement and applies reactions for the current frame.

Created and owned by [`SimulationManager`](SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`SimulationSchema`](SimulationSchema.ts)
Declares the ordered uniform field layouts for each simulation pass.

Consumed by pass constructors (buffer sizing) and [`ShaderFactory`](../shaders/ShaderFactory.ts) (WGSL struct
generation) so both sides stay in sync from a single source of truth.


---

### [`SimulationState`](SimulationState.ts)
Runtime state container for the simulation, accessible via {@link SimulationManager.state}.

Holds pause state, sim speed, resolution settings, and per-frame step counts.

UI panels and external callers read and write through this — the manager itself
uses it for clock scheduling and pass dispatch.

| Method | Description |
|--------|-------------|
| [`GetSimTime(): number`](SimulationState.ts) | Returns the accumulated simulation time in seconds. |
| [`GetSimStepCount(): number`](SimulationState.ts) | Returns the total number of simulation steps executed. |
| [`GetPhysicsTickCounter(): number`](SimulationState.ts) | Returns the current physics interval tick counter. |
| [`GetLastTickSimulationSteps(): number`](SimulationState.ts) | Returns the number of simulation steps that ran last frame. |
| [`GetLastTickPhysicsSteps(): number`](SimulationState.ts) | Returns the number of physics steps that ran last frame. |
| [`GetPaused(): boolean`](SimulationState.ts) | Returns whether the simulation is currently paused. |
| [`SetPaused(value: boolean): void`](SimulationState.ts) | Pauses or unpauses the simulation. |
| [`GetSimSpeed(): number`](SimulationState.ts) | Returns the current simulation speed multiplier. |
| [`SetSimSpeed(value: number): void`](SimulationState.ts) | Sets the simulation speed multiplier. |
| [`GetResolution(): number`](SimulationState.ts) | Returns the current resolution cap in pixels (0 = native). |
| [`SetResolution(value: number): void`](SimulationState.ts) | Sets the resolution cap in pixels (0 = native). |
| [`GetResolutionScale(): number`](SimulationState.ts) | Returns the current resolution scale factor (0–1). |
| [`SetResolutionScale(value: number): void`](SimulationState.ts) | Sets the resolution scale factor (0–1). |

---

### [`SimulationTexture`](SimulationTexture.ts)
A single `rgba8unorm` GPU texture used as the intent buffer between simulation passes.

Created by [`SimulationManager`](SimulationManager.ts) and shared with the passes that need it.


---

<!-- API_END -->