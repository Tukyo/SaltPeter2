

<!-- HIERARCHY_START -->
[Nitrate](../../README.md) / [Particle](../README.md) / Modules
<!-- HIERARCHY_END -->

<!-- API_START -->
---

## API

### [`CollisionModule`](CollisionModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleCollisionModule {
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
interface ParticleColorOverLifetimeModule {
    start: Color;
    end: Color;
}
```

---

### [`EmissionModule`](EmissionModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleEmissionModule {
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
        lifetime: { // How long each particle lives
            min: number;
            max: number;
        }
        speed: { // Initial speed
            min: number;
            max: number;
        }
    }
}
```

---

### [`NoiseModule`](NoiseModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleNoiseModule {
    type: NoiseType;
    octaves: number;
    persistence: number;
    scale: number;
    amplitude: number;
    scrollSpeed: Vec2;
}
```

---

### [`ShapeModule`](ShapeModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleShapeModule {
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
interface ParticleSubEmitterModule {
    spawnCondition: ParticleSubEmitterSpawnCondition;
    particle: ParticleId; // The particle to spawn when this triggers
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
interface ParticleVelocityOverLifetimeModule {
    linear?: {
        x?: {
            start: number;
            end: number;
        }
        y?: {
            start: number;
            end: number;
        }
    }
    speedMultiplier?: number;
}
```

---

### [`VisualModule`](VisualModule.ts)

| Interfaces & Types |
|--------------------|
```ts
interface ParticleVisualModule {
    material?: MaterialId,
    color?: Color;
}
```

---

<!-- API_END -->
