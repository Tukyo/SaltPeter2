import { Nitrate } from '@Nitrate';

// Handles ALT-key eyedropper sampling in the editor.
// While ALT is held the brush is blocked and a tooltip follows the cursor
// showing the sampled material colour swatch and name. ALT+click applies
// the sampled material, type, and colour variant to the active panels.
export class EyedropperController extends Nitrate.NitrateProcess {
    private readonly canvas: HTMLElement;
    private readonly getMaterialsPanel: () => Nitrate.MaterialsPanel | null;
    private readonly getBrushPanel: () => Nitrate.BrushPanel | null;

    private readonly tooltip: HTMLDivElement;
    private readonly colorSwatch: HTMLDivElement;
    private readonly nameSpan: HTMLSpanElement;
    private readonly idSpan: HTMLSpanElement;

    private isReading: boolean = false;
    private lastClientX: number = 0;
    private lastClientY: number = 0;
    private lastMaterialId: number = 0;
    private lastColorIndex: number = 0;

    private readonly unsubAltDown: (() => void) | undefined;
    private readonly unsubAltUp: (() => void) | undefined;
    private readonly unsubMouseMove: (() => void) | undefined;
    private readonly unsubMouseDown: (() => void) | undefined;

    constructor(
        canvas: HTMLElement,
        getMaterialsPanel: () => Nitrate.MaterialsPanel | null,
        getBrushPanel: () => Nitrate.BrushPanel | null,
    ) {
        super();
        this.canvas = canvas;
        this.getMaterialsPanel = getMaterialsPanel;
        this.getBrushPanel = getBrushPanel;

        this.tooltip = document.createElement('div');
        this.tooltip.id = 'eyedropper-tooltip';

        this.colorSwatch = document.createElement('div');
        this.colorSwatch.className = 'eyedropper-color';

        const info = document.createElement('div');
        info.className = 'eyedropper-info';

        const label = document.createElement('span');
        label.className = 'eyedropper-label';
        label.textContent = 'Material:';

        this.nameSpan = document.createElement('span');
        this.nameSpan.className = 'eyedropper-name';

        this.idSpan = document.createElement('span');
        this.idSpan.className = 'eyedropper-id';

        info.appendChild(label);
        info.appendChild(this.nameSpan);
        info.appendChild(this.idSpan);
        this.tooltip.appendChild(this.colorSwatch);
        this.tooltip.appendChild(info);
        document.body.appendChild(this.tooltip);

        const input = Nitrate.Input.Instance;

        this.unsubAltDown = input?.OnKeyDown('Alt', () => {
            Nitrate.BrushManager.Instance?.Block();
            this.canvas.style.cursor = 'crosshair';
        });

        this.unsubAltUp = input?.OnKeyUp('Alt', () => {
            Nitrate.BrushManager.Instance?.Unblock();
            this.canvas.style.cursor = 'none';
            this.HideTooltip();
        });

        this.unsubMouseMove = input?.OnCanvasMouseMove((e) => {
            this.lastClientX = e.clientX;
            this.lastClientY = e.clientY;
            if (!input.IsKeyDown('Alt')) { return; }
            this.MoveTooltip(e.clientX, e.clientY);
        });

        this.unsubMouseDown = input?.OnCanvasMouseDown(0, (e) => {
            if (!input.IsKeyDown('Alt')) { return; }
            e.preventDefault();
            this.ApplyEyedropper();
        });
    }

    private MoveTooltip(clientX: number, clientY: number): void {
        this.tooltip.style.transform = `translate(${clientX + 16}px, ${clientY + 16}px)`;
    }

    private HideTooltip(): void {
        this.tooltip.classList.remove('is-visible');
    }

    public Update(now: number): void {
        if (!Nitrate.Input.Instance?.IsKeyDown('Alt') || this.isReading) { return; }
        void this.ReadAtPosition();
    }

    private async ReadAtPosition(): Promise<void> {
        if (this.isReading) { return; }
        const mouse = Nitrate.Input.Instance?.GetMouseState();
        const simulationLayer = Nitrate.SimulationManager.Instance?.simulationLayer;
        const reader = Nitrate.SimulationManager.Instance?.texturePixelReader;
        const canvas = Nitrate.Renderer.Instance?.GetWebGPU()?.canvas;
        if (!mouse || !simulationLayer || !reader || !canvas) { return; }

        const texX = Math.floor(mouse.canvas.pos.x * simulationLayer.width / Math.max(1, canvas.width));
        const texY = Math.floor(mouse.canvas.pos.y * simulationLayer.height / Math.max(1, canvas.height));

        if (texX < 0 || texX >= simulationLayer.width || texY < 0 || texY >= simulationLayer.height) { return; }

        this.isReading = true;
        let bytes: number[];
        try {
            bytes = await reader.ReadPixel({
                texture: simulationLayer.currentIdentity,
                pos: { x: texX, y: texY },
                format: 'rgba8unorm',
            });
        } catch {
            this.isReading = false;
            return;
        }
        this.isReading = false;

        if (!Nitrate.Input.Instance?.IsKeyDown('Alt')) { return; }

        const materialId = bytes[0];
        const colorIndex = Nitrate.MaterialQuery.DecodeColorIndex(bytes[1]);

        this.lastMaterialId = materialId;
        this.lastColorIndex = colorIndex;

        this.UpdateTooltipContent(materialId, colorIndex);
    }

    private UpdateTooltipContent(materialId: number, colorIndex: number): void {
        if (materialId === 0) {
            this.HideTooltip();
            return;
        }

        const material = Object.values(Nitrate.MaterialRegistry.Materials).find(m => m.id === materialId) ?? null;
        if (!material) { this.HideTooltip(); return; }

        const safeIndex = Math.min(colorIndex, material.colors.length - 1);
        const color = material.colors[safeIndex];
        if (color) {
            this.colorSwatch.style.backgroundColor =
                `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
        }

        const displayName = material.name.charAt(0).toUpperCase() + material.name.slice(1);
        this.nameSpan.textContent = displayName;
        this.idSpan.textContent = String(materialId);

        this.MoveTooltip(this.lastClientX, this.lastClientY);
        this.tooltip.classList.add('is-visible');
    }

    private ApplyEyedropper(): void {
        if (this.lastMaterialId === 0) { return; }
        const materialsPanel = this.getMaterialsPanel();
        const brushPanel = this.getBrushPanel();
        if (!materialsPanel || !brushPanel) { return; }

        materialsPanel.SetActiveMaterialById(this.lastMaterialId as Nitrate.MaterialId);
        if (brushPanel.GetBrushType() === 'noise') { brushPanel.SetBrushType('palette'); }
        brushPanel.SetColorVariant(this.lastColorIndex);
    }

    public OnDestroy(): void {
        this.unsubAltDown?.();
        this.unsubAltUp?.();
        this.unsubMouseMove?.();
        this.unsubMouseDown?.();
        this.tooltip.remove();
        if (Nitrate.Input.Instance?.IsKeyDown('Alt')) {
            Nitrate.BrushManager.Instance?.Unblock();
        }
    }
}
