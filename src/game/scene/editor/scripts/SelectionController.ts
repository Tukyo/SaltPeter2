import { Nitrate } from "@Nitrate";

export class SelectionController extends Nitrate.NitrateProcess {
    private readonly canvas: HTMLElement;

    private readonly unsubShiftDown: (() => void) | undefined;
    private readonly unsubShiftUp: (() => void) | undefined;
    private readonly unsubCtrlDown: (() => void) | undefined;
    private readonly unsubCtrlUp: (() => void) | undefined;
    private readonly unsubMouseDown: (() => void) | undefined;
    private readonly unsubMouseMove: (() => void) | undefined;
    private readonly unsubMouseUp: (() => void) | undefined;

    private selection: Nitrate.Rect2D | null = null;
    private selectionDragStart: Nitrate.Vec2 | null = null;

    constructor(canvas: HTMLElement) {
        super();
        this.canvas = canvas;

        const input = Nitrate.Input.Instance;

        this.unsubShiftDown = input?.OnKeyDown('Shift', () => {
            Nitrate.BrushManager.Instance?.Block();
        });

        this.unsubShiftUp = input?.OnKeyUp('Shift', () => {
            this.selectionDragStart = null;
            if (!input.IsKeyDown('Control')) {
                Nitrate.BrushManager.Instance?.Unblock();
            }
        });

        this.unsubCtrlDown = input?.OnKeyDown('Control', () => {
            Nitrate.BrushManager.Instance?.Block();
        });

        this.unsubCtrlUp = input?.OnKeyUp('Control', () => {
            if (!input.IsKeyDown('Shift')) {
                Nitrate.BrushManager.Instance?.Unblock();
            }
        });

        this.unsubMouseDown = input?.OnMouseDown(0, (e) => {
            if (!input.IsKeyDown('Shift')) { return; }
            e.preventDefault();
            const cell = this.MouseToCell(e);
            this.selectionDragStart = cell;
            this.selection = { x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y };
        });

        this.unsubMouseMove = input?.OnMouseMove((e) => {
            if (!this.selectionDragStart || !input.GetMouseState().leftDown) { return; }
            const cell = this.MouseToCell(e);
            this.selection = {
                x1: this.selectionDragStart.x,
                y1: this.selectionDragStart.y,
                x2: cell.x,
                y2: cell.y,
            };
        });

        this.unsubMouseUp = input?.OnMouseUp(0, (e) => {
            if (!this.selectionDragStart) { return; }
            const dragStart = this.selectionDragStart;
            this.selectionDragStart = null;
            const cell = this.MouseToCell(e);
            if (cell.x === dragStart.x && cell.y === dragStart.y) {
                this.selection = null;
            }
        });
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
        this.unsubShiftDown?.();
        this.unsubShiftUp?.();
        this.unsubCtrlDown?.();
        this.unsubCtrlUp?.();
        this.unsubMouseDown?.();
        this.unsubMouseMove?.();
        this.unsubMouseUp?.();
    }
}
