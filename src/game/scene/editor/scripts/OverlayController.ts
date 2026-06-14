import { Nitrate } from "@Nitrate";
import { AnchorController } from './AnchorController';
import { SelectionController } from './SelectionController';

export class OverlayController extends Nitrate.NitrateProcess {
    private readonly selection: SelectionController | null;
    private readonly anchor: AnchorController | null;

    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private gridOverlay: Nitrate.Renderer2D | null = null;
    private selectionCanvas: Nitrate.Renderer2D | null = null;

    private blueprintGrid: { width: number; height: number } | null = null;

    constructor(selection: SelectionController | null, anchor: AnchorController | null) {
        super();
        this.selection = selection;
        this.anchor = anchor;
    }

    public Init(grid: { width: number; height: number }, pixel: { width: number; height: number }): void {
        if (this.selection !== null) {
            if (this.gridOverlay) { Nitrate.Renderer.Destroy2D(this.gridOverlay); }
            this.gridOverlay = this.CreateGridOverlay(grid, pixel);
        }

        if (this.selectionCanvas) { Nitrate.Renderer.Destroy2D(this.selectionCanvas); }
        this.selectionCanvas = this.CreateSelectionCanvas(pixel);

        this.canvas = this.selectionCanvas.canvas;
        this.ctx = this.selectionCanvas.canvas.getContext('2d');
    }

    public SetBlueprintGuide(grid: { width: number; height: number }): void { this.blueprintGrid = grid; }

    public Update(now: number): void {
        const ctx = this.ctx;
        const canvas = this.canvas;
        if (!ctx || !canvas) { return; }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.blueprintGrid !== null) {
            const grid = this.blueprintGrid;
            const cellPxW = canvas.width / grid.width;
            const cellPxH = canvas.height / grid.height;

            const margin = Nitrate.BlueprintLayout.GetMarginSize();
            const contentX = margin * cellPxW;
            const contentY = margin * cellPxH;
            const contentW = (grid.width - 2 * margin) * cellPxW;
            const contentH = (grid.height - 2 * margin) * cellPxH;

            ctx.fillStyle = 'rgba(255, 0, 0, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(contentX, contentY, contentW, contentH);

            const eZones = Nitrate.BlueprintLayout.GetEdgeZones(grid.width, grid.height);
            const edgeKey = (key: Nitrate.EdgeKey) => eZones.find(z => z.key === key)?.bounds;

            for (const { bounds } of eZones) {
                ctx.clearRect(
                    bounds.x1 * cellPxW, bounds.y1 * cellPxH,
                    (bounds.x2 - bounds.x1) * cellPxW, (bounds.y2 - bounds.y1) * cellPxH
                );
            }

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(contentX + 0.5, contentY + 0.5, contentW - 1, contentH - 1);
            ctx.setLineDash([]);

            const isLandscape = grid.width > grid.height;
            const marginPxW = contentX;
            const marginPxH = contentY;
            const farX = contentX + contentW;
            const farY = contentY + contentH;

            ctx.strokeStyle = 'rgba(100, 180, 255, 0.7)';
            ctx.lineWidth = 1;
            for (const lx of [marginPxW + 0.5, farX + 0.5]) {
                ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, canvas.height); ctx.stroke();
            }
            for (const ly of [marginPxH + 0.5, farY + 0.5]) {
                ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(canvas.width, ly); ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(255, 180, 80, 0.7)';

            if (isLandscape) {
                const nL = edgeKey('N_L'), nR = edgeKey('N_R'), bW = edgeKey('W');
                if (!nL || !nR || !bW) { return; }
                for (const cellX of [nL.x1, nL.x2, nR.x1, nR.x2]) {
                    const lx = cellX * cellPxW + 0.5;
                    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, marginPxH); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(lx, farY); ctx.lineTo(lx, canvas.height); ctx.stroke();
                }
                for (const cellY of [bW.y1, bW.y2]) {
                    const ly = cellY * cellPxH + 0.5;
                    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(marginPxW, ly); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(farX, ly); ctx.lineTo(canvas.width, ly); ctx.stroke();
                }
            } else {
                const wT = edgeKey('W_T'), wB = edgeKey('W_B'), bN = edgeKey('N');
                if (!wT || !wB || !bN) { return; }
                for (const cellY of [wT.y1, wT.y2, wB.y1, wB.y2]) {
                    const ly = cellY * cellPxH + 0.5;
                    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(marginPxW, ly); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(farX, ly); ctx.lineTo(canvas.width, ly); ctx.stroke();
                }
                for (const cellX of [bN.x1, bN.x2]) {
                    const lx = cellX * cellPxW + 0.5;
                    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, marginPxH); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(lx, farY); ctx.lineTo(lx, canvas.height); ctx.stroke();
                }
            }

            return;
        }

        if (!this.selection) { return; }
        const norm = this.selection.GetNormalizedSelection();
        if (!norm) { return; }

        const gridSize = Nitrate.SimulationManager.Instance?.simulationLayer?.width ?? 64;
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

        const anchorCell = this.anchor?.GetAnchorCell() ?? null;
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

    private CreateGridOverlay(
        grid: { width: number; height: number },
        pixel: { width: number; height: number }
    ): Nitrate.Renderer2D {
        const overlay = Nitrate.Renderer.Create2D({
            containerId: 'sim-container',
            canvasId: 'sim-grid',
            size: { width: pixel.width, height: pixel.height },
            style: {
                display: 'block', position: 'absolute', top: '0', left: '0',
                pointerEvents: 'none', zIndex: '2', background: 'transparent',
            },
        });

        const ctx = overlay.canvas.getContext('2d');
        if (ctx) {
            const cellPxW = pixel.width / grid.width;
            const cellPxH = pixel.height / grid.height;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= grid.width; x++) {
                const px = x * cellPxW + 0.5;
                ctx.moveTo(px, 0);
                ctx.lineTo(px, pixel.height);
            }
            for (let y = 0; y <= grid.height; y++) {
                const py = y * cellPxH + 0.5;
                ctx.moveTo(0, py);
                ctx.lineTo(pixel.width, py);
            }
            ctx.stroke();
        }

        return overlay;
    }

    private CreateSelectionCanvas(pixel: { width: number; height: number }): Nitrate.Renderer2D {
        return Nitrate.Renderer.Create2D({
            containerId: 'sim-container',
            canvasId: 'sim-selection',
            size: { width: pixel.width, height: pixel.height },
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
