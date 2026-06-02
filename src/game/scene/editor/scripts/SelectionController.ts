import { Nitrate } from "@Nitrate";

export class SelectionController extends Nitrate.NitrateProcess {
    private readonly canvas: HTMLElement;

    private readonly handleKeyDown: (e: KeyboardEvent) => void;
    private readonly handleKeyUp: (e: KeyboardEvent) => void;
    private readonly handleMouseDown: (e: MouseEvent) => void;
    private readonly handleMouseMove: (e: MouseEvent) => void;
    private readonly handleMouseUp: (e: MouseEvent) => void;

    private selection: Nitrate.Rect2D | null = null;
    private selectionDragStart: Nitrate.Vec2 | null = null;
    private shiftDown: boolean = false;
    private ctrlDown: boolean = false;

    constructor(canvas: HTMLElement) {
        super();
        this.canvas = canvas;

        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') { this.shiftDown = true; Nitrate.BrushManager.Instance?.Block(); }
            if (e.key === 'Control') { this.ctrlDown = true; Nitrate.BrushManager.Instance?.Block(); }
        };

        this.handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                this.shiftDown = false;
                this.selectionDragStart = null;
                if (!this.ctrlDown) { Nitrate.BrushManager.Instance?.Unblock(); }
            }
            if (e.key === 'Control') {
                this.ctrlDown = false;
                if (!this.shiftDown) { Nitrate.BrushManager.Instance?.Unblock(); }
            }
        };

        this.handleMouseDown = (e: MouseEvent) => {
            if (!e.shiftKey || e.button !== 0) { return; }
            e.preventDefault();
            const cell = this.MouseToCell(e);
            this.selectionDragStart = cell;
            this.selection = { x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y };
        };

        this.handleMouseMove = (e: MouseEvent) => {
            if (!this.selectionDragStart || !(e.buttons & 1)) { return; }
            const cell = this.MouseToCell(e);
            this.selection = {
                x1: this.selectionDragStart.x,
                y1: this.selectionDragStart.y,
                x2: cell.x,
                y2: cell.y,
            };
        };

        this.handleMouseUp = (e: MouseEvent) => {
            if (!this.selectionDragStart || e.button !== 0) { return; }
            const dragStart = this.selectionDragStart;
            this.selectionDragStart = null;
            const cell = this.MouseToCell(e);
            if (cell.x === dragStart.x && cell.y === dragStart.y) {
                this.selection = null;
            }
        };

        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    public Reset(): void {
        this.selection = null;
        this.selectionDragStart = null;
    }

    public SetSelection(rect: Nitrate.Rect2D | null): void {
        this.selection = rect;
        this.selectionDragStart = null;
    }

    public GetNormalizedSelection(): Nitrate.Rect2D | null {
        if (!this.selection) { return null; }
        return {
            x1: Math.min(this.selection.x1, this.selection.x2),
            y1: Math.min(this.selection.y1, this.selection.y2),
            x2: Math.max(this.selection.x1, this.selection.x2),
            y2: Math.max(this.selection.y1, this.selection.y2),
        };
    }

    private MouseToCell(e: MouseEvent): Nitrate.Vec2 {
        const gridSize = Nitrate.SimulationManager.Instance?.simulationLayer?.width ?? 64;
        const rect = this.canvas.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        return {
            x: Math.min(gridSize - 1, Math.floor(nx * gridSize)),
            y: Math.min(gridSize - 1, Math.floor(ny * gridSize)),
        };
    }

    public OnDestroy(): void {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}
