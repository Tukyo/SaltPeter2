import type { BrushShape } from './BrushTypes';

import { BrushManager } from './BrushManager';
import { Input } from '../input/Input';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';
import { SimulationManager } from '../simulation/SimulationManager';

/**
 * Provides the scene with a Brush Preview. Renders a DOM overlay that follows the cursor and reflects the current brush size and shape.
 * ```ts
 * new Nitrate.BrushPreview();
 * ```
 */
export class BrushPreview extends NitrateProcess {
    private readonly canvas: HTMLCanvasElement;
    private readonly element: HTMLDivElement;

    private lastSize: number = -1;
    private lastCellW: number = -1;
    private lastCellX: number = -1;
    private lastCellY: number = -1;
    private lastIsErase: boolean = false;
    private lastShape: BrushShape = 'circle';

    constructor() {
        super();

        const renderer = Renderer.Instance?.GetWebGPU();
        if (!renderer) { throw new Error('BrushPreview requires an active Renderer'); }

        this.canvas = renderer.canvas;
        this.element = document.createElement('div');
        this.element.id = 'brush-preview';
        document.body.appendChild(this.element);
    }

    public Start(): void {
        LogManager.Instance?.Log({
            text: 'BrushPreview start.',
            options: {
                tags: ['Brush', "NitrateProcessInit"]
            }
        });
    }

    public Update(now: number): void {
        const mouse = Input.Instance?.GetMouseState();
        if (!mouse || !mouse.isInside) { this.Hide(); return; }

        const brushState = BrushManager.Instance?.state;
        const simulationLayer = SimulationManager.Instance?.simulationLayer;
        if (!brushState || !simulationLayer) { this.Hide(); return; }

        const rect = this.canvas.getBoundingClientRect();
        const simWidth = simulationLayer.width;
        const simHeight = simulationLayer.height;
        const cellW = rect.width / Math.max(1, simWidth);
        const cellH = rect.height / Math.max(1, simHeight);

        const size = Math.max(1, brushState.GetSize());
        const elW = size * cellW;
        const elH = size * cellH;

        let screenX: number;
        let screenY: number;
        let cellX: number;
        let cellY: number;

        if (brushState.GetSnap()) {
            cellX = Math.floor(mouse.pos.x * simWidth / Math.max(1, this.canvas.width));
            cellY = Math.floor(mouse.pos.y * simHeight / Math.max(1, this.canvas.height));
            const halfSize = Math.floor(size / 2);
            screenX = rect.left + (cellX - halfSize) * cellW;
            screenY = rect.top + rect.height - (cellY + 1 + halfSize) * cellH;
        } else {
            const csX = rect.width / Math.max(1, this.canvas.width);
            const csY = rect.height / Math.max(1, this.canvas.height);
            cellX = Math.floor(mouse.pos.x * simWidth / Math.max(1, this.canvas.width));
            cellY = Math.floor(mouse.pos.y * simHeight / Math.max(1, this.canvas.height));
            screenX = rect.left + mouse.pos.x * csX - elW / 2;
            screenY = rect.top + rect.height - mouse.pos.y * csY - elH / 2;
        }

        const isErase = mouse.rightDown;
        const shape = brushState.GetShape();
        const sizeChanged = size !== this.lastSize || cellW !== this.lastCellW;

        if (sizeChanged) {
            this.element.style.width = elW + 'px';
            this.element.style.height = elH + 'px';
            this.lastSize = size;
            this.lastCellW = cellW;
        }

        if (cellX !== this.lastCellX || cellY !== this.lastCellY || sizeChanged) {
            this.element.style.transform = 'translate(' + screenX + 'px, ' + screenY + 'px)';
            this.lastCellX = cellX;
            this.lastCellY = cellY;
        }

        if (isErase !== this.lastIsErase) {
            this.element.classList.toggle('is-erase', isErase);
            this.lastIsErase = isErase;
        }

        if (shape !== this.lastShape) {
            this.element.style.borderRadius = shape === 'circle' ? '50%' : '0';
            this.lastShape = shape;
        }

        this.element.classList.add('is-visible');
    }

    /** Hides the brush preview. */
    private Hide(): void { this.element.classList.remove('is-visible'); }

    public OnDestroy(): void {
        this.element.remove();
        LogManager.Instance?.Log({
            text: 'BrushPreview destroyed.',
            options: {
                tags: ['Brush', "NitrateProcessDestroy"]
            }
        });
    }
}
