import { Nitrate } from "@Nitrate";
import { AnchorController } from './AnchorController';
import { SelectionController } from './SelectionController';

export class OverlayController extends Nitrate.NitrateProcess {
    private readonly selection: SelectionController;
    private readonly anchor: AnchorController;

    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private gridOverlay: Nitrate.Renderer2D | null = null;
    private selectionCanvas: Nitrate.Renderer2D | null = null;

    constructor(selection: SelectionController, anchor: AnchorController) {
        super();
        this.selection = selection;
        this.anchor = anchor;
    }

    public Init(gridSize: number, pixelSize: number): void {
        if (this.gridOverlay) { Nitrate.Renderer.Destroy2D(this.gridOverlay); }
        this.gridOverlay = this.CreateGridOverlay(gridSize, pixelSize);

        if (this.selectionCanvas) { Nitrate.Renderer.Destroy2D(this.selectionCanvas); }
        this.selectionCanvas = this.CreateSelectionCanvas(pixelSize);

        this.canvas = this.selectionCanvas.canvas;
        this.ctx = this.selectionCanvas.canvas.getContext('2d');
    }

    public Update(now: number): void {
        const ctx = this.ctx;
        const canvas = this.canvas;
        if (!ctx || !canvas) { return; }

        const norm = this.selection.GetNormalizedSelection();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!norm) { return; }

        const gridSize = Nitrate.SimulationManager.Instance?.pingPong?.width ?? 64;
        const cellPx = canvas.width / gridSize;

        const px = norm.x1 * cellPx;
        const py = norm.y1 * cellPx;
        const pw = (norm.x2 - norm.x1 + 1) * cellPx;
        const ph = (norm.y2 - norm.y1 + 1) * cellPx;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

        const anchorCell = this.anchor.GetAnchorCell();
        if (anchorCell) {
            const ax = anchorCell.x * cellPx;
            const ay = anchorCell.y * cellPx;
            ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ax + 0.5, ay + 0.5);
            ctx.lineTo(ax + cellPx - 0.5, ay + cellPx - 0.5);
            ctx.moveTo(ax + cellPx - 0.5, ay + 0.5);
            ctx.lineTo(ax + 0.5, ay + cellPx - 0.5);
            ctx.stroke();
        }
    }

    private CreateGridOverlay(gridSize: number, pixelSize: number): Nitrate.Renderer2D {
        const overlay = Nitrate.Renderer.Create2D({
            containerId: 'sim-container',
            canvasId: 'sim-grid',
            size: { width: pixelSize, height: pixelSize },
            style: {
                display: 'block', position: 'absolute', top: '0', left: '0',
                pointerEvents: 'none', zIndex: '2', background: 'transparent',
            },
        });

        const ctx = overlay.canvas.getContext('2d');
        if (ctx) {
            const cellPx = pixelSize / gridSize;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= gridSize; x++) {
                const px = x * cellPx + 0.5;
                ctx.moveTo(px, 0);
                ctx.lineTo(px, pixelSize);
            }
            for (let y = 0; y <= gridSize; y++) {
                const py = y * cellPx + 0.5;
                ctx.moveTo(0, py);
                ctx.lineTo(pixelSize, py);
            }
            ctx.stroke();
        }

        return overlay;
    }

    private CreateSelectionCanvas(pixelSize: number): Nitrate.Renderer2D {
        return Nitrate.Renderer.Create2D({
            containerId: 'sim-container',
            canvasId: 'sim-selection',
            size: { width: pixelSize, height: pixelSize },
            style: {
                display: 'block', position: 'absolute', top: '0', left: '0',
                pointerEvents: 'none', zIndex: '3', background: 'transparent',
            },
        });
    }

    public OnDestroy(): void {
        if (this.gridOverlay) { Nitrate.Renderer.Destroy2D(this.gridOverlay); }
        if (this.selectionCanvas) { Nitrate.Renderer.Destroy2D(this.selectionCanvas); }

        this.canvas = null;
        this.ctx = null;
        this.gridOverlay = null;
        this.selectionCanvas = null;
    }
}
