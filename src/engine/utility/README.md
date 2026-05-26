<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Utility
<!-- HIERARCHY_END -->

# Utility
### Shared math and utility functions.

General-purpose helpers used across the engine — clamping, number parsing, and other stateless operations. No dependencies on any other engine module.

<!-- API_START -->
---

## API

### [`Noise`](Noise.ts)
 Utility class that provides general noise-based math.

| Interfaces & Types |
|--------------------|
```ts
enum NoiseType {
    Perlin = 'perlin',
    Ridged = 'ridged',
    Worley = 'worley',
    Voronoi = 'voronoi',
    Hash2D = 'hash2d'
}
```

```ts
interface GetNoiseParams {
    noiseType: NoiseType;
    coords: Vec2;
    seed: number;
    options: NoiseOptions;
}
```

```ts
interface NoiseOptions {
    octaves?: number;
    persistence?: number;
    scale?: number;
    amplitude?: number;
}
```

| Method | Description |
|--------|-------------|
| [`static GetNoise(params: GetNoiseParams): number`](Noise.ts) | Helper function to switch between noise types |
| [`static Hash2D(x: number, y: number, seed: number): number`](Noise.ts) | Generates a deterministic pseudo-random value from integer coordinates and a seed. Uses a fast 2D hash function to produce a normalized float in [0, 1]. |

---

### [`Utils`](Utils.ts)
 General-purpose math and formatting utilities.

| Method | Description |
|--------|-------------|
| [`static FlipY(y: number, height: number): number`](Utils.ts) | Flips a Y coordinate between sim space (origin at bottom, increases upward) and Canvas 2D / CSS screen space (origin at top, increases downward). The operation is its own inverse: FlipY(FlipY(y, h), h) === y. |
| [`static Clamp(value: number, min: number, max: number): number`](Utils.ts) | Clamps a value between min and max (inclusive). |
| [`static FiniteNumber(value: unknown, fallback: number): number`](Utils.ts) | Parses a value as a finite number, returning fallback if it is NaN or infinite. |
| [`static FormatDecimal(value: number, maxDecimals: number): string`](Utils.ts) | Formats a number to at most maxDecimals decimal places, stripping trailing zeros. |
| [`static ComputeGridPixelSize(size: Size2D): Size2D`](Utils.ts) | Computes the largest pixel canvas size that fits within the window for the given grid dimensions. |
| [`static Smoothstep(t: number): number`](Utils.ts) | Applies a smooth cubic ease curve to `t` in [0, 1]. |
| [`static Lerp(a: number, b: number, t: number): number`](Utils.ts) | Linearly interpolates between `a` and `b` by factor `t`. |
| [`static Normalize(value: number): number`](Utils.ts) | Clamps `value` to [0, 1]. |
| [`static Seed(): number`](Utils.ts) | Returns a random 32-bit unsigned integer seed. |

---

<!-- API_END -->