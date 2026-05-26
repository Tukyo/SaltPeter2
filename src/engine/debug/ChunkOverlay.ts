import type { BiomeDisplay } from '../world/biome/BiomeQuery';
import type { ChunkAddress } from '../world/chunk/ChunkData';
import type { Vec2 } from '../definitions/Primitives';

import { BiomeQuery } from '../world/biome/BiomeQuery';
import { Camera } from '../camera/Camera';
import { ChunkData } from '../world/chunk/ChunkData';
import { ChunkManager } from '../world/chunk/ChunkManager';
import { Renderer } from '../rendering/Renderer';
import { Renderer2D } from '../rendering/Renderer2D';
import { SimulationManager } from '../simulation/SimulationManager';
import { Utils } from '../utility/Utils';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

interface ChunkLabel {
    pos: Vec2;
    topY: number;
    address: ChunkAddress;
    biomeDisplay: BiomeDisplay;
}

/**
 * Renders the chunk grid, biome labels, and world origin axes as a 2D canvas overlay.
 * 
 * Owned and driven by {@link DebugOverlay} — do not instantiate directly.
 */
export class ChunkOverlay {
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

        const data = this.Sample(this.renderer2D.canvas);
        if (!data) { return; }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        for (const x of data.xs) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.renderer2D.canvas.height);
            ctx.stroke();
        }
        for (const y of data.ys) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.renderer2D.canvas.width, y);
            ctx.stroke();
        }

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
        ctx.moveTo(data.origin.x, 0);
        ctx.lineTo(data.origin.x, this.renderer2D.canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(80, 255, 80, 0.6)';
        ctx.moveTo(0, data.origin.y);
        ctx.lineTo(this.renderer2D.canvas.width, data.origin.y);
        ctx.stroke();

        const pad = 4;
        ctx.font = '13px monospace';
        for (const label of data.labels) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeText(`${label.address.cx},${label.address.cy}`, label.pos.x + pad, label.pos.y - pad - 5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.fillText(`${label.address.cx},${label.address.cy}`, label.pos.x + pad, label.pos.y - pad - 5);

            const { biomeDisplay } = label;
            const boxW = ctx.measureText(biomeDisplay.label).width + pad * 2;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(label.pos.x + pad, label.topY + pad, boxW, 18);
            ctx.fillStyle = biomeDisplay.color;
            ctx.fillText(biomeDisplay.label, label.pos.x + pad * 2, label.topY + pad + 13);
        }
    }

    /** Computes chunk grid lines, biome labels, and world origin position in canvas space for the current camera view. @internal */
    private Sample(canvas: HTMLCanvasElement): { xs: number[]; ys: number[]; labels: ChunkLabel[]; origin: Vec2 } | null {
        const pingPong = SimulationManager.Instance?.pingPong;
        if (!pingPong || !World.Instance) { return null; }

        const cam = Camera.Instance;
        if (!cam) { return null; }

        const chunkSize = ChunkData.GetChunkSize();
        const { x: simOriginX, y: simOriginY } = World.Instance.GetSimOrigin();
        const { chunk } = WorldConfig.GetConfig();
        const margin = chunk.margin * chunk.size;

        const contentWidth = pingPong.width - 2 * margin;
        const contentHeight = pingPong.height - 2 * margin;
        const scaleX = canvas.width / contentWidth;
        const scaleY = canvas.height / contentHeight;

        const { x: camX, y: camY } = cam.GetCameraPos();
        const camCellX = camX * contentWidth / canvas.width;
        const camCellY = -camY * contentHeight / canvas.height;

        const worldLeft = margin + simOriginX + camCellX;
        const worldRight = pingPong.width - margin + simOriginX + camCellX;
        const worldTop = margin + simOriginY + camCellY;
        const worldBottom = pingPong.height - margin + simOriginY + camCellY;

        const xs: number[] = [];
        const ys: number[] = [];
        const labels: ChunkLabel[] = [];

        const startCol = Math.floor(worldLeft / chunkSize);
        const endCol = Math.ceil(worldRight / chunkSize);
        const startRow = Math.floor(worldTop / chunkSize);
        const endRow = Math.ceil(worldBottom / chunkSize);

        for (let i = startCol; i <= endCol; i++) {
            xs.push((i * chunkSize - simOriginX - margin - camCellX) * scaleX);
        }
        for (let i = startRow; i <= endRow; i++) {
            ys.push(Utils.FlipY((i * chunkSize - simOriginY - margin - camCellY) * scaleY, canvas.height));
        }

        for (const chunk of ChunkManager.Instance?.Entries() ?? []) {
            const { cx, cy } = chunk.address;
            const canvasX = (cx * chunkSize - simOriginX - margin - camCellX) * scaleX;
            const canvasBottomY = Utils.FlipY((cy * chunkSize - simOriginY - margin - camCellY) * scaleY, canvas.height);
            const canvasTopY = Utils.FlipY(((cy + 1) * chunkSize - simOriginY - margin - camCellY) * scaleY, canvas.height);
            const center = { x: cx * chunkSize + chunkSize / 2, y: cy * chunkSize + chunkSize / 2 };
            const { biome } = BiomeQuery.FindByWorldPos(center);
            labels.push({
                pos: { x: canvasX, y: canvasBottomY },
                topY: canvasTopY,
                address: chunk.address,
                biomeDisplay: BiomeQuery.GetDisplay(biome.name),
            });
        }

        const origin: Vec2 = {
            x: (0 - simOriginX - margin - camCellX) * scaleX,
            y: Utils.FlipY((0 - simOriginY - margin - camCellY) * scaleY, canvas.height),
        };

        return { xs, ys, labels, origin };
    }

    /** Creates the 2D canvas overlay and rendering context. */
    private Create(width: number, height: number): void {
        this.renderer2D = Renderer2D.Create({
            containerId: 'sim-container',
            canvasId: 'chunk-overlay',
            size: { width, height },
            style: {
                display: 'block',
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                zIndex: '10',
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
    public OnDestroy(): void {
        if (this.renderer2D) { Renderer.Destroy2D(this.renderer2D); }
        this.renderer2D = null;
        
        this.ctx = null;
    }
}
