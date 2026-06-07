<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Definitions
<!-- HIERARCHY_END -->

# Definitions
Shared interfaces and types.

<!-- API_START -->
---

## API

### [`Primitives`](Primitives.ts)

| Interfaces & Types |
|--------------------|
```ts
interface Vec2 { x: number; y: number; }
```

```ts
interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}
```

```ts
interface Size2D { width: number; height: number; }
```

```ts
interface Rect2D {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
```

```ts
interface NumberRange { min: number; max: number; }
```

```ts
interface RandomBetweenTwo<T> { first: T; second: T; }
```

---

<!-- API_END -->