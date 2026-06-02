import { Nitrate } from "@Nitrate";
import { SelectionController } from './SelectionController';

export class AnchorController extends Nitrate.NitrateProcess {
    private readonly canvas: HTMLElement;
    private readonly selection: SelectionController;
    
    private readonly handleMouseDown: (e: MouseEvent) => void;
    
    private anchorCell: Nitrate.Vec2 | null = null;

    constructor(canvas: HTMLElement, selection: SelectionController) {
        super();
        this.canvas = canvas;
        this.selection = selection;

        this.handleMouseDown = (e: MouseEvent) => {
            if (!e.ctrlKey || e.shiftKey || e.button !== 0) { return; }
            const norm = this.selection.GetNormalizedSelection();
            if (!norm) { return; }
            e.preventDefault();
            const cell = this.MouseToCell(e);
            if (cell.x < norm.x1 || cell.x > norm.x2 || cell.y < norm.y1 || cell.y > norm.y2) { return; }
            if (this.anchorCell && this.anchorCell.x === cell.x && this.anchorCell.y === cell.y) {
                this.anchorCell = null;
            } else {
                this.anchorCell = cell;
            }
        };

        canvas.addEventListener('mousedown', this.handleMouseDown);
    }

    public Update(now: number): void {
        if (!this.anchorCell) { return; }
        const norm = this.selection.GetNormalizedSelection();
        if (!norm) { this.anchorCell = null; return; }
        const { x, y } = this.anchorCell;
        if (x < norm.x1 || x > norm.x2 || y < norm.y1 || y > norm.y2) { this.anchorCell = null; }
    }

    public Reset(): void {
        this.anchorCell = null;
    }

    public SetAnchor(cell: Nitrate.Vec2 | null): void {
        this.anchorCell = cell;
    }

    public GetAnchorCell(): Nitrate.Vec2 | null {
        return this.anchorCell;
    }

    public OnDestroy(): void {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
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
}
