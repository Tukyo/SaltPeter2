import { Camera } from '../camera/Camera';
import { Renderer } from '../rendering/Renderer';
import { Renderer2D } from '../rendering/Renderer2D';
import { SimulationManager } from '../simulation/SimulationManager';
import { Utils } from '../utility/Utils';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

/**
 * Reads the physics texture and renders per-cell pressure as a greyscale wash.
 * 
 * Owned and driven by {@link DebugOverlay} — do not instantiate directly.
 */
export class PressureOverlay {
    private renderer2D: Renderer2D | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private tmpCanvas: HTMLCanvasElement | null = null;
    private visible: boolean = false;
    private readPending: boolean = false;

    /** Shows the overlay canvas. @internal */
    public Show(): void {
        this.visible = true;
        if (this.renderer2D) { this.renderer2D.canvas.style.display = 'block'; }
    }

    /** Hides the overlay canvas. @internal */
    public Hide(): void {
        this.visible = false;
        if (this.renderer2D) { this.renderer2D.canvas.style.display = 'none'; }
    }

    /** Reads the physics texture and draws the pressure visualisation for the current frame. Lazy-creates the canvas on first call. @internal */
    public Update(): void {
        if (!this.visible || this.readPending) { return; }
        const sim = SimulationManager.Instance;
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!sim?.pingPong || !renderer) { return; }

        const { pingPong } = sim;
        const { device } = renderer;
        const { width, height } = pingPong;

        if (!this.renderer2D) { this.Create(renderer.canvas.width, renderer.canvas.height); }
        if (!this.renderer2D || !this.ctx || !this.tmpCanvas) { return; }

        const margin = World.Instance
            ? WorldConfig.GetConfig().chunk.margin * WorldConfig.GetConfig().chunk.size
            : 0;
        const contentW = width - 2 * margin;
        const contentH = height - 2 * margin;

        const cam = Camera.Instance;
        const camOriginX = cam ? Math.round(margin + cam.GetCameraPos().x * contentW / renderer.canvas.width) : margin;
        const camOriginY = cam ? Math.round(margin - cam.GetCameraPos().y * contentH / renderer.canvas.height) : margin;

        this.readPending = true;
        const bytesPerPixel = 16;
        const bytesPerRow = Math.ceil(contentW * bytesPerPixel / 256) * 256;
        const gpuBuffer = device.createBuffer({
            size: bytesPerRow * contentH,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const enc = device.createCommandEncoder();
        enc.copyTextureToBuffer(
            { texture: pingPong.currentPhysics, origin: [camOriginX, camOriginY] },
            { buffer: gpuBuffer, bytesPerRow },
            [contentW, contentH]
        );
        device.queue.submit([enc.finish()]);

        void gpuBuffer.mapAsync(GPUMapMode.READ).then(() => {
            if (!this.ctx || !this.renderer2D || !this.tmpCanvas) { return; }
            const floats = new Float32Array(gpuBuffer.getMappedRange());
            const floatsPerRow = bytesPerRow / 4;
            const imageData = this.ctx.createImageData(contentW, contentH);
            const pixels = imageData.data;
            for (let y = 0; y < contentH; y++) {
                for (let x = 0; x < contentW; x++) {
                    const src = y * floatsPerRow + x * 4;
                    const pressure = Math.max(0, Math.min(1, floats[src + 1]));
                    const dst = ((Utils.FlipY(y, contentH) - 1) * contentW + x) * 4;
                    pixels[dst] = 255;
                    pixels[dst + 1] = 255;
                    pixels[dst + 2] = 255;
                    pixels[dst + 3] = Math.round(pressure * 127);
                }
            }
            this.tmpCanvas.width = contentW;
            this.tmpCanvas.height = contentH;
            this.tmpCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
            this.ctx.clearRect(0, 0, this.renderer2D.canvas.width, this.renderer2D.canvas.height);
            this.ctx.drawImage(this.tmpCanvas, 0, 0, this.renderer2D.canvas.width, this.renderer2D.canvas.height);
            gpuBuffer.unmap();
            gpuBuffer.destroy();
        }).finally(() => {
            this.readPending = false;
        });
    }

    /** Creates and mounts the overlay canvas and 2D rendering context. @internal */
    private Create(width: number, height: number): void {
        this.renderer2D = Renderer2D.Create({
            containerId: 'sim-container',
            canvasId: 'pressure-overlay',
            size: { width, height },
            style: {
                display: 'block',
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                zIndex: '11',
            },
        });
        this.ctx = this.renderer2D.canvas.getContext('2d');
        this.tmpCanvas = document.createElement('canvas');
    }

    /** Resizes the overlay canvas to match the current renderer dimensions. Called by DebugOverlay on window resize. @internal */
    public OnResize(): void {
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu || !this.renderer2D) { return; }
        this.renderer2D.canvas.width = webgpu.canvas.width;
        this.renderer2D.canvas.height = webgpu.canvas.height;
    }

    /** Removes the overlay canvas and releases all references. Called by DebugOverlay on scene teardown. @internal */
    public OnDestroy(): void {
        if (this.renderer2D) { Renderer.Destroy2D(this.renderer2D); }
        this.renderer2D = null;
        
        this.ctx = null;
        this.tmpCanvas = null;
    }
}
