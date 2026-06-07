

<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Particle](../README.md) / Modules
<!-- HIERARCHY_END -->
# Particle Modules

Modules are the building blocks of a [`ParticleDefinition`](../ParticleModel.ts). Each module controls one aspect of particle behavior. `main` is the only required module — all others are optional and gated by `enabled?: boolean` *(omitting the module entirely is equivalent to `enabled: false`)*.

Modules are packed into the [`ParticleDefinitionBuffer`](../ParticleDefinitionBuffer.ts) by `PackDefinition` and consumed in WGSL by the emission and simulation shaders. Fields that accept [`RandomBetweenTwo<T>`](../../definitions/Primitives.ts) have both endpoints packed into adjacent buffer slots — the shader picks one at random per particle at spawn time.

<!-- API_START -->
---

## API

### [`CollisionModule`](CollisionModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleCollisionModule extends ParticleModule {
    bounce: number; // Velocity reflection factor (0 = stick, 1 = perfect reflect)
    dampen: number; // Velocity scale applied after bounce
    lifetimeLoss: number; // Fraction of maxLifetime removed per collision
    minKillSpeed: number; // Kill particle if post-collision speed drops below this
}
```

---

### [`ColorOverLifetimeModule`](ColorOverLifetimeModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleColorOverLifetimeModule extends ParticleModule {
    start: Color | RandomBetweenTwo<Color>;
    end: Color | RandomBetweenTwo<Color>;
}
```

---

### [`EmissionModule`](EmissionModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleEmissionModule extends ParticleModule {
    bursts?: {
        count: number; // How many particles per burst
        time: number; // When in the cycle the burst fires
        cycles: number; // How many times to repeat the burst
        interval: number; // Time between burst cycles
        probability: number; // Chance of the burst occuring
    }[]
    rate?: {
        time?: number; // Particles spawned per second
        distance?: number; // Particles spawned per cell moved
    }
}
```

---

### [`InheritVelocityModule`](InheritVelocityModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleInheritVelocityModule extends ParticleModule {
    mode: InheritVelocityMode;
    multiplier: number;
}
```

---

### [`MainModule`](MainModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleMainModule {
    duration: number; // How long the system runs
    gravityMultiplier?: number; // Gravity multiplier applied to the particle
    loop: boolean; // Restarts after duration
    start: {
        delay?: number; // Delay before first emission
        lifetime: number | NumberRange; // How long each particle lives
        speed: number | NumberRange; // Initial speed
    }
}
```

---

### [`NoiseModule`](NoiseModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleNoiseModule extends ParticleModule {
    type: NoiseType;
    octaves: number;
    persistence: number;
    scale: number;
    amplitude: number | RandomBetweenTwo<number>
    scrollSpeed: Vec2 | RandomBetweenTwo<Vec2>
}
```

---

### [`ShapeModule`](ShapeModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleShapeModule extends ParticleModule {
    box?: ParticleBoxShape;
    circle?: ParticleCircleShape;
    cone?: ParticleConeShape;
}
```

```ts
interface ParticleBoxShape {
    size: Size2D; // Size of the box
}
```

```ts
interface ParticleCircleShape {
    radius: number; // Radius of the circle
}
```

```ts
interface ParticleConeShape {
    angle: number; // Spread of the cone
    direction: { // Direction of the cone
        x: number;
        y: number;
    }
    length: number; // Length of the cone
}
```

---

### [`SubEmitterModule`](SubEmitterModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleSubEmitterModule extends ParticleModule {
    spawnCondition: ParticleSubEmitterSpawnCondition;
    particle: ParticleId; // The particle to spawn when this triggers
    inherit?: Array<keyof ParticleDefinition['modules']>; // What modules from the parent to inherit
    probability: number; // (0 - 1) - 1 means it always happens, 0 means it never will
}
```

```ts
type ParticleSubEmitterSpawnCondition =
    | "Birth" // Spawns the sub particle on birth of the base particle
    | "Collision" // Spawns the sub particle on collision with the sim
    | "Death"
```

---

### [`VelocityOverLifetimeModule`](VelocityOverLifetimeModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleVelocityOverLifetimeModule extends ParticleModule {
    linear?: {
        x?: { start: number; end: number; } | RandomBetweenTwo<{ start: number; end: number }>
        y?: { start: number; end: number; } | RandomBetweenTwo<{ start: number; end: number }>
    }
    speedMultiplier?: number;
}
```

---

### [`VisualModule`](VisualModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleVisualModule extends ParticleModule {
    material?: MaterialId,
    color?: Color | RandomBetweenTwo<Color>
}
```

---

<!-- API_END -->
