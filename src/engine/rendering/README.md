<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Rendering
<!-- HIERARCHY_END -->
# Rendering

The rendering module owns the WebGPU device and canvas lifecycle and drives the main display pass each frame.

[`Renderer`](Renderer.ts) is the entry point — use it to create and destroy both WebGPU and 2D canvas renderers. [`RenderingManager`](RenderingManager.ts) consumes the WebGPU renderer each frame to run the simulation display pass. [`TextureFactory`](TextureFactory.ts) and [`TexturePixelReader`](TexturePixelReader.ts) are utilities used internally and by debug/export tooling.

<!-- API_START -->
---

## API

### [`Renderer`](Renderer.ts)
Central manager for all renderers in a scene.

Owns the lists of active [`RendererWebGPU`](RendererWebGPU.ts) and [`Renderer2D`](Renderer2D.ts) instances and exposes
static factory methods to create or destroy them. Both renderer types are created through here
so the manager can track and clean them up on scene teardown.

```ts
const webgpu = await Renderer.CreateWebGPU(params);
const canvas = Renderer.Create2D(params);
```

| Method | Description |
|--------|-------------|
| [`static async CreateWebGPU(params: RendererWebGPUParams): Promise<RendererWebGPU>`](Renderer.ts) | Creates a WebGPU renderer and returns it. |
| [`static Create2D(params: Renderer2DParams): Renderer2D`](Renderer.ts) | Creates a 2D renderer and returns it. |
| [`static DestroyWebGPU(renderer: RendererWebGPU): void`](Renderer.ts) | Destroys a specific WebGPU renderer. |
| [`static Destroy2D(renderer: Renderer2D): void`](Renderer.ts) | Destroys a specific 2D renderer. |
| [`GetWebGPU(index = 0): RendererWebGPU \| null`](Renderer.ts) | Returns the first WebGPU renderer or the specified index, or `null` if none exists at that position. |
| [`Get2D(index = 0): Renderer2D \| null`](Renderer.ts) | Returns the first 2D renderer or the specified index, or `null` if none exists at that position. |

---

### [`Renderer2D`](Renderer2D.ts)
A 2D canvas renderer. Creates and owns an `HTMLCanvasElement` inside a given container.

Created via {@link Renderer.Create2D} — do not instantiate directly.

| Interfaces & Types |
|--------------------|
```ts
interface Renderer2DParams {
    containerId: string;
    canvasId: string;
    size: Size2D;
    style?: Partial<CSSStyleDeclaration>;
}
```

| Method | Description |
|--------|-------------|
| [`static Create(params: Renderer2DParams): Renderer2D`](Renderer2D.ts) | Creates a canvas element inside the specified container and returns the renderer. |
| [`Resize(size: Size2D): void`](Renderer2D.ts) | Resizes the canvas to the given dimensions. |

---

### [`RendererWebGPU`](RendererWebGPU.ts)
A WebGPU renderer. Owns the canvas, GPU device, context, and preferred texture format.

Created via {@link Renderer.CreateWebGPU} — do not instantiate directly.

| Interfaces & Types |
|--------------------|
```ts
interface RendererWebGPUParams {
    containerId: string;
    canvasId: string;
    size: Size2D;
    style?: Partial<CSSStyleDeclaration>;
}
```

| Method | Description |
|--------|-------------|
| [`static async Create(params: RendererWebGPUParams): Promise<RendererWebGPU>`](RendererWebGPU.ts) | Requests a WebGPU adapter and device, creates the canvas, and returns the renderer. |
| [`SetContainerStyle(styles: Partial<CSSStyleDeclaration>): void`](RendererWebGPU.ts) | Applies style overrides to the container element, saving originals so they can be restored on destroy. |
| [`Resize(size: Size2D): boolean`](RendererWebGPU.ts) | Resizes the canvas and reconfigures the context. Returns `false` if the size was unchanged. |

---

### [`RenderingManager`](RenderingManager.ts)
Drives the main WebGPU display pass each frame.

Waits for [`SimulationManager`](../simulation/SimulationManager.ts) to initialize, then builds a render pipeline using the
display shader and binds the simulation's ping-pong texture, material visual buffer, and a
crop/camera uniform. Each `Update` recomputes the crop UV from the active [`Camera`](../camera/Camera.ts) and
submits a fullscreen triangle pass to the WebGPU canvas.


---

### [`TextureFactory`](TextureFactory.ts)
 Factory for creating GPU textures with standard usage flags.


---

### [`TexturePixelReader`](TexturePixelReader.ts)
Utility for reading pixel data back from GPU textures to the CPU.

Maintains a small reusable `MAP_READ` buffer for single-pixel reads. `ReadRegion` allocates
a temporary buffer sized to the requested rows and destroys it after the read.

| Method | Description |
|--------|-------------|
| [`async ReadPixel(params: ReadPixelParams): Promise<number[]>`](TexturePixelReader.ts) | Reads a single pixel from a GPU texture at the given coordinates. Returns RGBA as a number array. |
| [`async ReadRegion(params: { texture: GPUTexture; rowStart: number; rowCount: number; fullWidth: number; }): Promise<{ data: Uint8Array; bytesPerRow: number }>`](TexturePixelReader.ts) | Reads a rectangular strip of full rows from a texture. Returns raw bytes (rgba8unorm) and the aligned bytes-per-row stride. The caller must use bytesPerRow to index: offset = row * bytesPerRow + col * 4. |

---

<!-- API_END -->