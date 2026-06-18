import type { Renderer2DParams } from './Renderer2D';
import type { RendererWebGPUParams } from './RendererWebGPU';

import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer2D } from './Renderer2D';
import { RendererWebGPU } from './RendererWebGPU';

/**
 * Central manager for all renderers in a scene.
 *
 * Owns the lists of active {@link RendererWebGPU} and {@link Renderer2D} instances and exposes
 * static factory methods to create or destroy them. Both renderer types are created through here
 * so the manager can track and clean them up on scene teardown.
 *
 * ```ts
 * const webgpu = await Renderer.CreateWebGPU(params);
 * const canvas = Renderer.Create2D(params);
 * ```
 */
export class Renderer extends NitrateProcess {
    public static Instance: Renderer | null = null;

    private readonly webgpuRenderers: RendererWebGPU[] = [];
    private readonly renderer2Ds: Renderer2D[] = [];

    private constructor() {
        super();
        this.Register();
        
        Renderer.Instance = this;
    }

    /** Creates a WebGPU renderer and returns it. */
    public static async CreateWebGPU(params: RendererWebGPUParams): Promise<RendererWebGPU> {
        const instance = Renderer.Instance ?? new Renderer();
        const renderer = await RendererWebGPU.Create(params);
        instance.webgpuRenderers.push(renderer);
        return renderer;
    }

    /** Creates a 2D renderer and returns it. */
    public static Create2D(params: Renderer2DParams): Renderer2D {
        const instance = Renderer.Instance ?? new Renderer();
        const renderer = Renderer2D.Create(params);
        instance.renderer2Ds.push(renderer);
        return renderer;
    }

    /** Destroys a specific WebGPU renderer. */
    public static DestroyWebGPU(renderer: RendererWebGPU): void {
        const instance = Renderer.Instance;
        if (instance) {
            const idx = instance.webgpuRenderers.indexOf(renderer);
            if (idx !== -1) { instance.webgpuRenderers.splice(idx, 1); }
        }
        renderer.Destroy();
    }

    /** Destroys a specific 2D renderer. */
    public static Destroy2D(renderer: Renderer2D): void {
        const instance = Renderer.Instance;
        if (instance) {
            const idx = instance.renderer2Ds.indexOf(renderer);
            if (idx !== -1) { instance.renderer2Ds.splice(idx, 1); }
        }
        renderer.Destroy();
    }

    /** Returns the first WebGPU renderer or the specified index, or `null` if none exists at that position. */
    public GetWebGPU(index = 0): RendererWebGPU | null {
        return this.webgpuRenderers[index] ?? null;
    }

    /** Returns the first 2D renderer or the specified index, or `null` if none exists at that position. */
    public Get2D(index = 0): Renderer2D | null {
        return this.renderer2Ds[index] ?? null;
    }

    public OnDestroy(): void {
        for (const renderer of this.webgpuRenderers) { renderer.Destroy(); }
        for (const renderer of this.renderer2Ds) { renderer.Destroy(); }
        
        this.webgpuRenderers.length = 0;
        this.renderer2Ds.length = 0;

        if (Renderer.Instance === this) {
            Renderer.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Renderer singleton instance.',
                options: { tags: ['Rendering', 'NitrateProcessDestroy'] }
            });
        }
    }
}
