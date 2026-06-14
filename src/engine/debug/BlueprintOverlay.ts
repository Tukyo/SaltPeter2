import { Camera } from '../camera/Camera';
import { ChunkData } from '../world/chunk/ChunkData';
import { Renderer } from '../rendering/Renderer';
import { Renderer2D } from '../rendering/Renderer2D';
import { SimulationManager } from '../simulation/SimulationManager';
import { Utils } from '../utility/Utils';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

interface StampDrawItem {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    isVertical: boolean;
}

/**
 * Renders blueprint stamp outlines and name labels as a 2D canvas overlay.
 * V tiles draw in red, H tiles draw in blue.
 *
 * Owned and driven by {@link DebugOverlay} — do not instantiate directly.
 */
export class BlueprintOverlay {
    private static readonly border: number = 4;

    private renderer2D: Renderer2D | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private visible: boolean = false;

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

    /** Called by DebugOverlay on each engine tick while this layer is active. @internal */
    public Update(): void {
        if (!this.visible) { return; }

        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu) { return; }

        if (!this.renderer2D) { this.Create(webgpu.canvas.width, webgpu.canvas.height); }
        if (!this.ctx || !this.renderer2D) { return; }

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.renderer2D.canvas.width, this.renderer2D.canvas.height);

        const items = this.Sample(this.renderer2D.canvas);
        if (!items) { return; }

        ctx.font = '11px monospace';
        ctx.lineJoin = 'round';

        for (const item of items) {
            const strokeColor = item.isVertical ? 'rgba(255, 80, 80, 0.9)' : 'rgba(80, 140, 255, 0.9)';
            const textColor = item.isVertical ? 'rgba(255, 180, 180, 1.0)' : 'rgba(160, 210, 255, 1.0)';

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(item.x, item.y, item.width, item.height);

            const textWidth = ctx.measureText(item.name).width;
            const labelX = item.x + item.width / 2 - textWidth / 2;
            const labelY = item.y + item.height / 2 + 4;

            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.strokeText(item.name, labelX, labelY);
            ctx.fillStyle = textColor;
            ctx.fillText(item.name, labelX, labelY);
        }
    }

    /** Converts placed blueprint records to canvas-space draw items. @internal */
    private Sample(canvas: HTMLCanvasElement): StampDrawItem[] | null {
        const simulationLayer = SimulationManager.Instance?.simulationLayer;
        if (!simulationLayer || !World.Instance) { return null; }

        const cam = Camera.Instance;
        if (!cam) { return null; }

        const registry = World.Instance.stampRegistry;
        if (!registry) { return null; }

        const chunkSize = ChunkData.GetChunkSize();
        const { x: simOriginX, y: simOriginY } = World.Instance.GetSimOrigin();
        const { chunk } = WorldConfig.GetConfig();
        const margin = chunk.margin * chunk.size;

        const contentWidth = simulationLayer.width - 2 * margin;
        const contentHeight = simulationLayer.height - 2 * margin;
        const scaleX = canvas.width / contentWidth;
        const scaleY = canvas.height / contentHeight;

        const { x: camX, y: camY } = cam.GetCameraPos();
        const camCellX = camX * contentWidth / canvas.width;
        const camCellY = -camY * contentHeight / canvas.height;

        const items: StampDrawItem[] = [];

        for (const record of registry.GetRecords()) {
            const { blueprint, chunkX, chunkY } = record;
            const contentW = blueprint.size.width - 2 * BlueprintOverlay.border;
            const contentH = blueprint.size.height - 2 * BlueprintOverlay.border;
            const isVertical = blueprint.size.height > blueprint.size.width;

            const worldLeft = chunkX * chunkSize;
            const worldBottom = chunkY * chunkSize;

            const canvasLeft = (worldLeft - simOriginX - margin - camCellX) * scaleX;
            const canvasTop = Utils.FlipY(
                ((worldBottom + contentH) - simOriginY - margin - camCellY) * scaleY,
                canvas.height
            );
            const canvasWidth = contentW * scaleX;
            const canvasHeight = contentH * scaleY;

            items.push({ x: canvasLeft, y: canvasTop, width: canvasWidth, height: canvasHeight, name: blueprint.name, isVertical });
        }

        return items;
    }

    /** Creates the 2D canvas overlay and rendering context. @internal */
    private Create(width: number, height: number): void {
        this.renderer2D = Renderer2D.Create({
            containerId: 'sim-container',
            canvasId: 'blueprint-overlay',
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
    }

    /** Called by DebugOverlay when the renderer canvas is resized. @internal */
    public OnResize(): void {
        const webgpu = Renderer.Instance?.GetWebGPU();
        if (!webgpu || !this.renderer2D) { return; }
        this.renderer2D.canvas.width = webgpu.canvas.width;
        this.renderer2D.canvas.height = webgpu.canvas.height;
    }

    /** Called by DebugOverlay on scene teardown. Removes the overlay canvas. @internal */
    public Destroy(): void {
        if (this.renderer2D) { Renderer.Destroy2D(this.renderer2D); }
        this.renderer2D = null;
        this.ctx = null;
    }
}
