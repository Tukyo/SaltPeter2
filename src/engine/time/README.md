

<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Time
<!-- HIERARCHY_END -->
# Time
Time management provided by the engine. Available helpers and Time related information available from the Time class.

<!-- API_START -->
---

## API

### [`Time`](Time.ts)
Provides read-only access to engine timing values. Updated by the engine each frame before Update fires.

```ts
Nitrate.Time.now // Current timestamp in milliseconds
Nitrate.Time.deltaTime // Time since last frame in seconds
Nitrate.Time.frame // Frame counter, increments every tick
```


---

<!-- API_END -->
