<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Particle
<!-- HIERARCHY_END -->
# Particle

The particle system provides a GPU-driven visual effect layer on top of the cellular simulation. Particles are cosmetic — they float above the sim and are never written back into it.

[`ParticleEmissionPass`](ParticleEmissionPass.ts) reads the sim identity texture each frame and probabilistically spawns particles into [`ParticleBuffer`](ParticleBuffer.ts) for any cell whose material has a registered source in [`ParticleSources`](ParticleSources.ts). [`ParticleSimulationPass`](ParticleSimulationPass.ts) applies behaviours based on the definition.

Particle types are declared as [`ParticleDefinition`](ParticleModel.ts) objects in the `definitions/` directory and auto-discovered by [`ParticleRegistry`](ParticleRegistry.ts) — no manual registration is needed. Particle behaviors are derived from the modules added to the definition.

<!-- API_START -->
---

## API

### [`ParticleBuffer`](ParticleBuffer.ts)
GPU storage buffer holding the live state of every particle for the current frame.

Capacity is fixed at startup from [`ParticleConfig`](../config/ParticleConfig.ts). Each slot stores:
posX, posY, velX, velY, lifetimeRemaining, maxLifetime, particleId, active.
Layout is read and written by the particle emission and simulation compute passes.


---

### [`ParticleDefinitionBuffer`](ParticleDefinitionBuffer.ts)
GPU storage buffer containing per-definition static params for every registered particle type.

Built once at startup from [`ParticleRegistry`](ParticleRegistry.ts) — packs each definition's emission rate,
lifetime range, speed range, and visual params into a flat `Float32Array` indexed by particle id.
Layout is defined by [`ParticleSchema`](ParticleSchema.ts).


---

### [`ParticleEmissionPass`](ParticleEmissionPass.ts)
GPU compute pass that reads the sim identity texture and emits new particles into [`ParticleBuffer`](ParticleBuffer.ts).

Each thread covers one sim cell. If that cell's material has a registered source in
[`ParticleSourceLookupBuffer`](ParticleSourceLookupBuffer.ts), the pass probabilistically spawns particles into the
particle buffer according to the matching [`ParticleDefinitionBuffer`](ParticleDefinitionBuffer.ts) emission rate.

Created and owned by [`SimulationManager`](../simulation/SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`ParticleIdentity`](ParticleIdentity.ts)

| Interfaces & Types |
|--------------------|
```ts
type ParticleName = keyof typeof ParticleIds;
```

```ts
type ParticleId = (typeof ParticleIds)[ParticleName];
```

---

### [`ParticleModel`](ParticleModel.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleDefinition {
    id: ParticleId;
    name: ParticleName;

    modules: {
        main: ParticleMainModule;
        visual: ParticleVisualModule;
        emission: ParticleEmissionModule;
        shape?: ParticleShapeModule;
        subEmitter?: ParticleSubEmitterModule;
        velocityOverLifetime?: ParticleVelocityOverLifetimeModule;
        colorOverLifetime?: ParticleColorOverLifetimeModule;
        noise?: ParticleNoiseModule;
        collision?: ParticleCollisionModule;
    }
}
```

---

### [`ParticleRegistry`](ParticleRegistry.ts)
Auto-discovers and indexes every particle definition in the `definitions/` directory.

Uses `import.meta.glob` to eagerly load all `.ts` files under `definitions/`, then
walks every export looking for objects with `name` and `id` properties. No manual
registration is needed — adding a definition file is enough.


---

### [`ParticleSchema`](ParticleSchema.ts)
Declares the ordered field layout for the per-particle-definition GPU buffer.

The field list drives both [`ParticleDefinitionBuffer`](ParticleDefinitionBuffer.ts) (which packs the data) and
[`ShaderFactory`](../shaders/ShaderFactory.ts) (which emits the matching WGSL struct), so both sides stay in sync
from a single source of truth.


---

### [`ParticleSimulationPass`](ParticleSimulationPass.ts)
GPU compute pass that ticks every live particle in [`ParticleBuffer`](ParticleBuffer.ts) each frame.

Each thread covers one particle slot. Updates position from velocity, decrements
lifetime, and marks the slot inactive when lifetime expires.

Created and owned by [`SimulationManager`](../simulation/SimulationManager.ts). Called each frame by the manager — not directly.


---

### [`ParticleSourceLookupBuffer`](ParticleSourceLookupBuffer.ts)
GPU storage buffer mapping each material ID to the particle IDs it emits.

Built once at startup from `Sources`. Each material slot holds up to
`maxParticlesPerMaterial` particle IDs (from [`ParticleConfig`](../config/ParticleConfig.ts)), padded with -1.
Indexed in the shader as materialId * maxParticlesPerMaterial + slotIndex.


---

### [`ParticleSources`](ParticleSources.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleSource {
    materials: MaterialName[];
    particles: ParticleName[];
}
```

```ts
const Sources: ParticleSource[] = [
    { materials: ['fire'], particles: ['fire', 'smoke'] },
    { materials: ['lava'], particles: ['lava'] },
    { materials: ['acid'], particles: ['acid'] },
];
```

---

<!-- API_END -->
