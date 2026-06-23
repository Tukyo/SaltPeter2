import { Nitrate } from '@Nitrate';

import PlayerCapsuleRaw from '../../resources/GameObjects/PlayerCapsule.gameobject.json';

type GameObjectJson = { components: Array<{ type: string } & Record<string, unknown>> };

export class PlayerScaleController extends Nitrate.NitrateProcess {
    private visible: boolean = false;
    private readonly pixelDataRenderer: Nitrate.PixelDataRenderer;
    private readonly cells: Nitrate.PixelCell[];
    private readonly pixelDataSize: Nitrate.Size2D;

    private cellPxW: number = 1;
    private cellPxH: number = 1;
    private containerRect: DOMRect | null = null;

    private positionX: number = 0;
    private positionY: number = 0;
    private dragging: boolean = false;
    private dragOffsetCellX: number = 0;
    private dragOffsetCellY: number = 0;

    private readonly unsubKeyDown: (() => void) | undefined;
    private readonly unsubMouseDown: (() => void) | undefined;
    private readonly unsubMouseMove: (() => void) | undefined;
    private readonly unsubMouseUp: (() => void) | undefined;

    constructor() {
        super();
        this.Register();

        const json = PlayerCapsuleRaw as unknown as GameObjectJson;
        const pixelDataRaw = json.components.find(c => c['type'] === 'PixelData');
        this.cells = (pixelDataRaw?.['cells'] as Nitrate.PixelCell[]) ?? [];
        this.pixelDataSize = (pixelDataRaw?.['size'] as Nitrate.Size2D) ?? { width: 7, height: 16 };

        this.pixelDataRenderer = new Nitrate.PixelDataRenderer({
            containerId: 'sim-container',
            canvasId: 'sim-player-scale',
            size: { width: 1, height: 1 },
            style: {
                display: 'none',
                position: 'absolute',
                top: '0',
                left: '0',
                imageRendering: 'pixelated',
                zIndex: '4',
                pointerEvents: 'none',
            },
        });

        const input = Nitrate.Input.Instance;
        const keybind = Nitrate.KeybindConfig.GetConfig().editor.playerScale;

        this.unsubKeyDown = input?.OnKeyDown(keybind, () => {
            this.visible = !this.visible;
            this.pixelDataRenderer.GetCanvas().style.display = this.visible ? 'block' : 'none';
        });

        this.unsubMouseDown = input?.OnCanvasMouseDown(0, (e) => {
            if (!this.visible) { return; }
            const rect = this.pixelDataRenderer.GetCanvas().getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                return;
            }
            this.dragging = true;
            this.dragOffsetCellX = Math.round((e.clientX - rect.left) / this.cellPxW);
            this.dragOffsetCellY = Math.round((e.clientY - rect.top) / this.cellPxH);
            if (Nitrate.BrushManager.Instance) { Nitrate.BrushManager.Instance.enabled = false; }
        });

        this.unsubMouseMove = input?.OnCanvasMouseMove((e) => {
            if (!this.dragging) { return; }
            const rect = this.containerRect ?? document.getElementById('sim-container')?.getBoundingClientRect();
            if (!rect) { return; }
            const cellX = Math.round((e.clientX - rect.left) / this.cellPxW) - this.dragOffsetCellX;
            const cellY = Math.round((e.clientY - rect.top) / this.cellPxH) - this.dragOffsetCellY;
            this.positionX = cellX * this.cellPxW;
            this.positionY = cellY * this.cellPxH;
            this.pixelDataRenderer.GetCanvas().style.left = `${this.positionX}px`;
            this.pixelDataRenderer.GetCanvas().style.top = `${this.positionY}px`;
        });

        this.unsubMouseUp = input?.OnScreenMouseUp(0, () => {
            if (!this.dragging) { return; }
            this.dragging = false;
            if (Nitrate.BrushManager.Instance) { Nitrate.BrushManager.Instance.enabled = true; }
        });
    }

    public Init(grid: { width: number; height: number }, pixel: { width: number; height: number }): void {
        this.cellPxW = pixel.width / grid.width;
        this.cellPxH = pixel.height / grid.height;
        this.containerRect = document.getElementById('sim-container')?.getBoundingClientRect() ?? null;

        this.pixelDataRenderer.Render(this.cells, this.pixelDataSize, 1);
        this.pixelDataRenderer.GetCanvas().style.width = `${this.pixelDataSize.width * this.cellPxW}px`;
        this.pixelDataRenderer.GetCanvas().style.height = `${this.pixelDataSize.height * this.cellPxH}px`;

        const centerCellX = Math.round((grid.width - this.pixelDataSize.width) / 2);
        const centerCellY = Math.round((grid.height - this.pixelDataSize.height) / 2);
        this.positionX = centerCellX * this.cellPxW;
        this.positionY = centerCellY * this.cellPxH;
        this.pixelDataRenderer.GetCanvas().style.left = `${this.positionX}px`;
        this.pixelDataRenderer.GetCanvas().style.top = `${this.positionY}px`;
    }

    public OnDestroy(): void {
        this.unsubKeyDown?.();
        this.unsubMouseDown?.();
        this.unsubMouseMove?.();
        this.unsubMouseUp?.();

        if (this.dragging) if (Nitrate.BrushManager.Instance) { Nitrate.BrushManager.Instance.enabled = true; }
        this.pixelDataRenderer.Destroy();
    }
}
