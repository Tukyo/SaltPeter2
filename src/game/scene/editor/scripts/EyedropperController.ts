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

    private altDown: boolean = false;
    private isReading: boolean = false;
    private lastClientX: number = 0;
    private lastClientY: number = 0;
    private lastMaterialId: number = 0;
    private lastColorIndex: number = 0;

    private readonly handleKeyDown: (e: KeyboardEvent) => void;
    private readonly handleKeyUp: (e: KeyboardEvent) => void;
    private readonly handleMouseMove: (e: MouseEvent) => void;
    private readonly handleMouseDown: (e: MouseEvent) => void;

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

        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Alt' || this.altDown) { return; }
            e.preventDefault();
            this.altDown = true;
            Nitrate.BrushManager.Instance?.Block();
            this.canvas.style.cursor = 'crosshair';
        };

        this.handleKeyUp = (e: KeyboardEvent) => {
            if (e.key !== 'Alt') { return; }
            this.altDown = false;
            Nitrate.BrushManager.Instance?.Unblock();
            this.canvas.style.cursor = 'none';
            this.HideTooltip();
        };

        this.handleMouseMove = (e: MouseEvent) => {
            this.lastClientX = e.clientX;
            this.lastClientY = e.clientY;
            if (!this.altDown) { return; }
            this.MoveTooltip(e.clientX, e.clientY);
        };

        this.handleMouseDown = (e: MouseEvent) => {
            if (!this.altDown || e.button !== 0) { return; }
            e.preventDefault();
            this.ApplyEyedropper();
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
    }

    private MoveTooltip(clientX: number, clientY: number): void {
        this.tooltip.style.transform = `translate(${clientX + 16}px, ${clientY + 16}px)`;
    }

    private HideTooltip(): void {
        this.tooltip.classList.remove('is-visible');
    }

    public Update(now: number): void {
        if (!this.altDown || this.isReading) { return; }
        void this.ReadAtPosition();
    }

    private async ReadAtPosition(): Promise<void> {
        if (this.isReading) { return; }
        const mouse = Nitrate.Input.Instance?.GetState();
        const pingPong = Nitrate.SimulationManager.Instance?.pingPong;
        const reader = Nitrate.SimulationManager.Instance?.texturePixelReader;
        const canvas = Nitrate.Renderer.Instance?.GetWebGPU()?.canvas;
        if (!mouse || !pingPong || !reader || !canvas) { return; }

        const texX = Math.floor(mouse.pos.x * pingPong.width / Math.max(1, canvas.width));
        const texY = Math.floor(mouse.pos.y * pingPong.height / Math.max(1, canvas.height));

        if (texX < 0 || texX >= pingPong.width || texY < 0 || texY >= pingPong.height) { return; }

        this.isReading = true;
        let bytes: number[];
        try {
            bytes = await reader.ReadPixel({
                texture: pingPong.currentIdentity,
                pos: { x: texX, y: texY },
                format: 'rgba8unorm',
            });
        } catch {
            this.isReading = false;
            return;
        }
        this.isReading = false;

        if (!this.altDown) { return; }

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
            this.colorSwatch.style.backgroundColor = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
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
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.tooltip.remove();
        if (this.altDown) {
            Nitrate.BrushManager.Instance?.Unblock();
            this.altDown = false;
        }
    }
}
