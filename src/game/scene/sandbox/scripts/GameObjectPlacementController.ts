import { Nitrate } from '@Nitrate';

export class GameObjectPlacementController extends Nitrate.NitrateProcess {
    private readonly canvas: HTMLCanvasElement;
    private readonly dragPreviewContainer: HTMLDivElement;
    private readonly dragPreviewRenderer: Nitrate.PixelDataRenderer;

    private readonly tiltSensitivity = 60;
    private readonly tiltMax = 45;
    private readonly tiltSettleMs = 100;

    private readonly handleDragOver: (e: DragEvent) => void;
    private readonly handleDrop: (e: DragEvent) => void;
    private readonly handleDragLeave: (e: DragEvent) => void;
    private readonly handleResourceDragStart: (e: Event) => void;
    private readonly handleResourceDragEnd: () => void;

    private dragPreviewReady = false;
    private lastDragX: number | null = null;
    private lastDragTime: number | null = null;
    private rotationResetTimeout: number | null = null;

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;

        this.dragPreviewContainer = document.createElement('div');
        this.dragPreviewContainer.id = 'drag-preview-container';
        this.dragPreviewContainer.style.cssText = 'position: fixed; pointer-events: none; z-index: 9999; display: none; transition: transform 0.15s ease-out;';
        document.body.appendChild(this.dragPreviewContainer);

        this.dragPreviewRenderer = new Nitrate.PixelDataRenderer({
            containerId: 'drag-preview-container',
            canvasId: 'drag-preview-canvas',
            size: { width: 1, height: 1 },
            style: { imageRendering: 'pixelated' },
        });

        this.handleDragOver = (e: DragEvent) => {
            if (!e.dataTransfer?.types.includes('text/plain')) { return; }
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';

            if (this.dragPreviewReady) {
                const previewCanvas = this.dragPreviewRenderer.canvas;
                this.dragPreviewContainer.style.display = 'block';
                this.dragPreviewContainer.style.left = `${e.clientX - previewCanvas.offsetWidth / 2}px`;
                this.dragPreviewContainer.style.top = `${e.clientY - previewCanvas.offsetHeight / 2}px`;

                const now = performance.now();
                if (this.lastDragX === null) { this.lastDragX = e.clientX; this.lastDragTime = now; }
                const deltaX = e.clientX - this.lastDragX;
                const deltaTime = Math.max(1, now - (this.lastDragTime ?? now));
                this.lastDragX = e.clientX;
                this.lastDragTime = now;
                const velocityX = deltaX / deltaTime;
                const tilt = Math.max(-this.tiltMax, Math.min(this.tiltMax, -velocityX * this.tiltSensitivity));
                this.dragPreviewContainer.style.transform = `rotate(${tilt}deg)`;

                if (this.rotationResetTimeout !== null) { window.clearTimeout(this.rotationResetTimeout); }
                this.rotationResetTimeout = window.setTimeout(() => {
                    this.dragPreviewContainer.style.transform = 'rotate(0deg)';
                    this.rotationResetTimeout = null;
                }, this.tiltSettleMs);
            }
        };

        this.handleDrop = (e: DragEvent) => {
            e.preventDefault();
            this.HideDragPreview();
            const path = e.dataTransfer?.getData('text/plain');
            if (!path || !path.endsWith('.json')) { return; }
            void this.PlaceGameObject(path, e.clientX, e.clientY);
        };

        this.handleDragLeave = (e: DragEvent) => {
            if (this.canvas.contains(e.relatedTarget as Node)) { return; }
            this.HideDragPreview();
        };

        this.handleResourceDragStart = (e: Event) => {
            const { path, isUserdata } = (e as CustomEvent<{ path: string; isUserdata: boolean }>).detail;
            this.dragPreviewReady = false;
            this.lastDragX = null;
            this.lastDragTime = null;
            void this.LoadDragPreview(path, isUserdata);
        };

        this.handleResourceDragEnd = () => {
            this.HideDragPreview();
        };

        this.canvas.addEventListener('dragover', this.handleDragOver);
        this.canvas.addEventListener('drop', this.handleDrop);
        this.canvas.addEventListener('dragleave', this.handleDragLeave);
        document.addEventListener('resource-drag-start', this.handleResourceDragStart);
        document.addEventListener('resource-drag-end', this.handleResourceDragEnd);
    }

    private HideDragPreview(): void {
        if (this.rotationResetTimeout !== null) {
            window.clearTimeout(this.rotationResetTimeout);
            this.rotationResetTimeout = null;
        }
        this.dragPreviewContainer.style.transform = 'rotate(0deg)';
        this.dragPreviewContainer.style.display = 'none';
        this.dragPreviewReady = false;
        this.lastDragX = null;
        this.lastDragTime = null;
    }

    private async LoadDragPreview(path: string, isUserdata: boolean): Promise<void> {
        if (!path.endsWith('.json')) { return; }

        const api = isUserdata ? window.api.userdata : window.api.resources;
        let content: string;
        try {
            content = await api.read(path);
        } catch {
            return;
        }

        let data: { components?: Array<Record<string, unknown>> };
        try {
            data = JSON.parse(content) as { components?: Array<Record<string, unknown>> };
        } catch {
            return;
        }

        const pixelDataRaw = data.components?.find(c => c['type'] === 'PixelData');
        if (!pixelDataRaw) { return; }

        const size = pixelDataRaw['size'] as Nitrate.Size2D;
        const cells = pixelDataRaw['cells'] as Nitrate.PixelCell[];
        const simLayer = Nitrate.SimulationManager.Instance?.simulationLayer;
        const rect = this.canvas.getBoundingClientRect();
        const pixelsPerCell = simLayer ? rect.width / simLayer.width : 1;
        const scale = Math.max(1, Math.floor(pixelsPerCell));

        this.dragPreviewRenderer.Render(cells, size, scale);
        this.dragPreviewReady = true;
    }

    private async PlaceGameObject(path: string, clientX: number, clientY: number): Promise<void> {
        const meta = await Nitrate.Metadata.Read(path);
        if (!meta || meta.type !== 'gameobject') { return; }

        const simLayer = Nitrate.SimulationManager.Instance?.simulationLayer;
        if (!simLayer) { return; }

        const rect = this.canvas.getBoundingClientRect();
        const dropX = (clientX - rect.left) * (this.canvas.width / rect.width);
        const dropY = (clientY - rect.top) * (this.canvas.height / rect.height);

        const simX = Math.round(dropX * simLayer.width / this.canvas.width);
        const simY = Math.round(simLayer.height - 1 - dropY * simLayer.height / this.canvas.height);

        await Nitrate.GameObject.Instantiate(meta.guid, { x: simX, y: simY });
    }

    public OnDestroy(): void {
        this.canvas.removeEventListener('dragover', this.handleDragOver);
        this.canvas.removeEventListener('drop', this.handleDrop);
        this.canvas.removeEventListener('dragleave', this.handleDragLeave);
        document.removeEventListener('resource-drag-start', this.handleResourceDragStart);
        document.removeEventListener('resource-drag-end', this.handleResourceDragEnd);
        this.dragPreviewRenderer.Destroy();
        this.dragPreviewContainer.remove();
    }
}
