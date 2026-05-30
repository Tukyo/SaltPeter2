import { Camera } from '../camera/Camera';
import { GameObjectManager } from '../game_object/GameObjectManager';
import { Renderer } from '../rendering/Renderer';
import { Renderer2D } from '../rendering/Renderer2D';
import { Rigidbody } from '../component/definitions/rigidbody/Rigidbody';
import { SimulationManager } from '../simulation/SimulationManager';
import { Transform } from '../component/definitions/transform/Transform';
import { Utils } from '../utility/Utils';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

/**
 * Debug overlay for visualising GameObject state in the simulation.
 * Driven by {@link DebugOverlay} — do not instantiate directly.
 */
export class GameObjectOverlay {
    private renderer2D: Renderer2D | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private tmpCanvas: HTMLCanvasElement | null = null;
    private visible: boolean = false;
    private readPending: boolean = false;

    /**
     * Converts an owner index > 0 to an RGBA tuple using golden-angle hue
     * spacing so each owner gets a visually distinct colour.
     */
    private static OwnerColor(owner: number): [number, number, number, number] {
        const hue = ((owner * 137.508) % 360) / 360;
        const saturation = 0.85;
        const lightness = 0.55;

        const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const hueSextant = hue * 6;
        const x = chroma * (1 - Math.abs(hueSextant % 2 - 1));
        const m = lightness - chroma / 2;

        let r = 0;
        let g = 0;
        let b = 0;

        if (hueSextant < 1) { r = chroma; g = x; b = 0; }
        else if (hueSextant < 2) { r = x; g = chroma; b = 0; }
        else if (hueSextant < 3) { r = 0; g = chroma; b = x; }
        else if (hueSextant < 4) { r = 0; g = x; b = chroma; }
        else if (hueSextant < 5) { r = x; g = 0; b = chroma; }
        else { r = chroma; g = 0; b = x; }

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
            200,
        ];
    }

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

    /**
     * Reads the ownership texture and repaints the overlay.
     * Lazy-creates the canvas on first call. @internal
     */
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
        const camOriginX = cam
            ? Math.round(margin + cam.GetCameraPos().x * contentW / renderer.canvas.width)
            : margin;
        const camOriginY = cam
            ? Math.round(margin - cam.GetCameraPos().y * contentH / renderer.canvas.height)
            : margin;

        // r32uint: 4 bytes per pixel (one u32 per cell)
        const bytesPerPixel = 4;
        const bytesPerRow = Math.ceil(contentW * bytesPerPixel / 256) * 256;

        this.readPending = true;

        const gpuBuffer = device.createBuffer({
            size: bytesPerRow * contentH,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const enc = device.createCommandEncoder();
        enc.copyTextureToBuffer(
            { texture: pingPong.currentOwnership, origin: [camOriginX, camOriginY] },
            { buffer: gpuBuffer, bytesPerRow },
            [contentW, contentH]
        );
        device.queue.submit([enc.finish()]);

        void gpuBuffer.mapAsync(GPUMapMode.READ).then(() => {
            if (!this.ctx || !this.renderer2D || !this.tmpCanvas) { return; }

            const u32s = new Uint32Array(gpuBuffer.getMappedRange());
            const u32sPerRow = bytesPerRow / 4;
            const imageData = this.ctx.createImageData(contentW, contentH);
            const pixels = imageData.data;

            // Cache colours for each owner seen this frame to avoid re-computing
            const colorCache = new Map<number, [number, number, number, number]>();

            for (let y = 0; y < contentH; y++) {
                for (let x = 0; x < contentW; x++) {
                    const owner = u32s[y * u32sPerRow + x];
                    if (owner === 0) { continue; }

                    let color = colorCache.get(owner);
                    if (!color) {
                        color = GameObjectOverlay.OwnerColor(owner);
                        colorCache.set(owner, color);
                    }

                    const dst = ((Utils.FlipY(y, contentH) - 1) * contentW + x) * 4;
                    pixels[dst] = color[0];
                    pixels[dst + 1] = color[1];
                    pixels[dst + 2] = color[2];
                    pixels[dst + 3] = color[3];
                }
            }

            this.tmpCanvas.width = contentW;
            this.tmpCanvas.height = contentH;
            this.tmpCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
            this.ctx.clearRect(0, 0, this.renderer2D.canvas.width, this.renderer2D.canvas.height);
            this.ctx.drawImage(
                this.tmpCanvas,
                0, 0,
                this.renderer2D.canvas.width,
                this.renderer2D.canvas.height
            );

            // Draw transform gizmos — red X axis (right), green Y axis (up in sim = up on screen)
            const manager = GameObjectManager.Instance;
            if (manager) {
                const arrowLength = 16; // canvas pixels
                const scaleX = this.renderer2D.canvas.width / contentW;
                const scaleY = this.renderer2D.canvas.height / contentH;

                this.ctx.lineWidth = 2;

                for (const gameObject of manager.GetAll()) {
                    const transform = gameObject.GetComponent(Transform);
                    if (!transform) { continue; }

                    const canvasX = (transform.position.x - camOriginX) * scaleX;
                    const canvasY = ((height - 1 - transform.position.y) - camOriginY) * scaleY;

                    // Dot at anchor — black when sleeping, white when awake
                    const rigidbody = gameObject.GetComponent(Rigidbody);
                    this.ctx.fillStyle = rigidbody?.isSleeping ? 'black' : 'white';
                    this.ctx.beginPath();
                    this.ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
                    this.ctx.fill();

                    // X axis — red, pointing right
                    this.ctx.strokeStyle = 'rgba(255, 60, 60, 1.0)';
                    this.ctx.beginPath();
                    this.ctx.moveTo(canvasX, canvasY);
                    this.ctx.lineTo(canvasX + arrowLength, canvasY);
                    this.ctx.stroke();

                    // Y axis — green, pointing up (sim Y-up = canvas Y-up after flip)
                    this.ctx.strokeStyle = 'rgba(60, 255, 60, 1.0)';
                    this.ctx.beginPath();
                    this.ctx.moveTo(canvasX, canvasY);
                    this.ctx.lineTo(canvasX, canvasY - arrowLength);
                    this.ctx.stroke();
                }
            }

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
            canvasId: 'gameObject-overlay',
            size: { width, height },
            style: {
                display: 'block',
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                zIndex: '12',
            },
        });
        this.ctx = this.renderer2D.canvas.getContext('2d');
        this.tmpCanvas = document.createElement('canvas');
    }

    /** Resizes the overlay canvas to match the current renderer dimensions. @internal */
    public OnResize(): void {
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu || !this.renderer2D) { return; }
        this.renderer2D.canvas.width = webgpu.canvas.width;
        this.renderer2D.canvas.height = webgpu.canvas.height;
    }

    /** Removes the overlay canvas and releases all references. @internal */
    public OnDestroy(): void {
        if (this.renderer2D) { Renderer.Destroy2D(this.renderer2D); }
        this.renderer2D = null;
        this.ctx = null;
        this.tmpCanvas = null;
    }
}
