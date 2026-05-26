import type { Size2D } from "../definitions/Primitives";

export interface RendererWebGPUParams {
    containerId: string;
    canvasId: string;
    size: Size2D;
    style?: Partial<CSSStyleDeclaration>;
}

/**
 * A WebGPU renderer. Owns the canvas, GPU device, context, and preferred texture format.
 *
 * Created via {@link Renderer.CreateWebGPU} — do not instantiate directly.
 */
export class RendererWebGPU {
    private readonly container: HTMLElement;
    public readonly canvas: HTMLCanvasElement;
    public readonly device: GPUDevice;
    public readonly context: GPUCanvasContext;
    public readonly format: GPUTextureFormat;

    private readonly styleOverrides = new Map<string, string>();

    private constructor(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        context: GPUCanvasContext,
        format: GPUTextureFormat,
        container: HTMLElement
    ) {
        this.canvas = canvas;
        this.device = device;
        this.context = context;
        this.format = format;
        this.container = container;
    }

    /** Requests a WebGPU adapter and device, creates the canvas, and returns the renderer. */
    public static async Create(params: RendererWebGPUParams): Promise<RendererWebGPU> {
        const container = document.getElementById(params.containerId);
        if (!container) { throw new Error('RendererWebGPU: no container found with id ' + params.containerId); }

        const canvas = document.createElement('canvas');
        canvas.id = params.canvasId;
        canvas.width = params.size.width;
        canvas.height = params.size.height;
        if (params.style) { Object.assign(canvas.style, params.style); }
        container.appendChild(canvas);

        if (!navigator.gpu) { throw new Error('RendererWebGPU: WebGPU is not supported in this browser.'); }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) { throw new Error('RendererWebGPU: could not get a WebGPU adapter. Try Chrome 113+.'); }

        const device = await adapter.requestDevice({
            requiredLimits: {
                maxStorageTexturesPerShaderStage: adapter.limits.maxStorageTexturesPerShaderStage,
                maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
                maxBufferSize: adapter.limits.maxBufferSize,
            },
        });

        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format });

        return new RendererWebGPU(canvas, device, context, format, container);
    }

    /** Applies style overrides to the container element, saving originals so they can be restored on destroy. */
    public SetContainerStyle(styles: Partial<CSSStyleDeclaration>): void {
        for (const [key, value] of Object.entries(styles)) {
            if (!this.styleOverrides.has(key)) {
                this.styleOverrides.set(key, (this.container.style as unknown as Record<string, string>)[key] ?? '');
            }
            (this.container.style as unknown as Record<string, string>)[key] = value as string;
        }
    }

    /** Resizes the canvas and reconfigures the context. Returns `false` if the size was unchanged. */
    public Resize(size: Size2D): boolean {
        if (this.canvas.width === size.width && this.canvas.height === size.height) { return false; }
        this.canvas.width = size.width;
        this.canvas.height = size.height;
        this.context.configure({ device: this.device, format: this.format });
        return true;
    }
    
    /** Restores container styles, removes the canvas, and destroys the GPU device. Use {@link Renderer.DestroyWebGPU} instead. @internal */
    public Destroy(): void {
        for (const [key, value] of this.styleOverrides) {
            (this.container.style as unknown as Record<string, string>)[key] = value;
        }
        this.styleOverrides.clear();
        this.canvas.remove();
        this.device.destroy();
    }
}
