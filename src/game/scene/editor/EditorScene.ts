import { Nitrate } from '@Nitrate';

import type { EditorMode } from './scripts/EditorModeController';

import { AnchorController } from './scripts/AnchorController';
import { EditorModeController } from './scripts/EditorModeController';
import { EyedropperController } from './scripts/EyedropperController';
import { OverlayController } from './scripts/OverlayController';
import { SelectionController } from './scripts/SelectionController';

export class EditorScene extends Nitrate.Scene {
    private mode: EditorMode = 'gameobject';

    private renderer: Nitrate.RendererWebGPU | null = null;

    private modeController: EditorModeController | null = null;

    private goExport: Nitrate.ExportGameObject | null = null;
    private bpExport: Nitrate.ExportBlueprint | null = null;
    private goImport: Nitrate.ImportGameObject | null = null;
    private bpImport: Nitrate.ImportBlueprint | null = null;

    private selectionController: SelectionController | null = null;
    private anchorController: AnchorController | null = null;
    private overlayController: OverlayController | null = null;
    private eyedropperController: EyedropperController | null = null;
    private gridOverlay: Nitrate.Renderer2D | null = null;

    private hierarchy: Nitrate.Hierarchy | null = null;
    private renderingPanel: Nitrate.RenderingPanel | null = null;
    private materialsPanel: Nitrate.MaterialsPanel | null = null;
    private brushPanel: Nitrate.BrushPanel | null = null;
    private scenePanel: Nitrate.ScenePanel | null = null;

    private restartHandle: number | null = null;

    public async Init(): Promise<void> {
        this.renderer = await Nitrate.Renderer.CreateWebGPU({
            containerId: 'sim-container',
            canvasId: 'sim-canvas',
            size: { width: 1, height: 1 },
            style: { display: 'block', cursor: 'none', background: '#111', imageRendering: 'pixelated' },
        });

        new Nitrate.Input(this.renderer.canvas);
        new Nitrate.BrushPreview();
        new Nitrate.RenderingManager();
        new Nitrate.BrushManager();

        new Nitrate.SimulationManager();
        Nitrate.SimulationManager.Instance?.Block();

        new Nitrate.UserInterfaceManager();

        this.modeController = new EditorModeController((mode) => { void this.SetMode(mode); });

        new Nitrate.Resources({ onImport: (path) => { void this.RunImport(path); } });

        this.hierarchy = new Nitrate.Hierarchy();

        this.goExport = new Nitrate.ExportGameObject();
        this.bpExport = new Nitrate.ExportBlueprint();
        this.goImport = new Nitrate.ImportGameObject();
        this.bpImport = new Nitrate.ImportBlueprint();

        new Nitrate.LogManager({
            quiet: true,
            showTimestamps: true
        });

        this.SetupModeSpecific();
        this.InitGPU();
    }

    private async SetMode(newMode: EditorMode): Promise<void> {
        if (newMode === this.mode) { return; }
        if (Nitrate.SceneManager.IsDirty()) {
            const confirmed = await Nitrate.Modal.Confirm({
                title: 'Switch Mode?',
                confirmLabel: 'Switch',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) {
                this.modeController?.SetMode(this.mode);
                return;
            }
        }
        this.SwitchModeNoInit(newMode);
        this.InitGPU();
    }

    /** Tears down, switches mode, and sets up — but does NOT call InitGPU. Caller is responsible. */
    private SwitchModeNoInit(newMode: EditorMode): void {
        this.TeardownModeSpecific();
        this.hierarchy?.Clear();
        this.mode = newMode;
        this.modeController?.SetMode(newMode);
        this.SetupModeSpecific();
    }

    private SetupModeSpecific(): void {
        const renderer = this.renderer;
        if (!renderer) { return; }

        if (this.mode === 'gameobject') {
            this.hierarchy?.AddHierarchyObject({ components: [Nitrate.PixelData] });

            this.selectionController = new SelectionController(renderer.canvas);
            this.anchorController = new AnchorController(renderer.canvas, this.selectionController);
            this.overlayController = new OverlayController(this.selectionController, this.anchorController);

            this.goExport?.SetSelectionProvider(() => this.selectionController?.GetNormalizedSelection() ?? null);
            this.goExport?.SetAnchorProvider(() => this.anchorController?.GetAnchorCell() ?? null);
            this.goExport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);
            this.goImport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);

            this.renderingPanel = new Nitrate.RenderingPanel({
                type: 'grid',
                sizes: [
                    { width: 32, height: 32 },
                    { width: 64, height: 64 },
                    { width: 128, height: 128 },
                    { width: 256, height: 256 },
                ],
                onChange: () => { this.ScheduleRestart(); },
            });

            this.materialsPanel = new Nitrate.MaterialsPanel({ activeMaterial: { defaultMaterial: 'sand' } });

            this.brushPanel = new Nitrate.BrushPanel({
                size: { min: 1, max: 10, default: 1 },
                shape: { default: 'square' },
                mode: { default: 'draw' },
                type: { default: 'palette' },
                snap: { default: true, show: false },
            });

            if (renderer) {
                this.eyedropperController = new EyedropperController(
                    renderer.canvas,
                    () => this.materialsPanel,
                    () => this.brushPanel,
                );
            }
        } else {
            this.hierarchy?.AddHierarchyObject({ components: [Nitrate.Blueprint] });

            this.bpExport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);
            this.bpImport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);

            this.renderingPanel = new Nitrate.RenderingPanel({
                type: 'grid',
                sizes: [
                    { width: 128, height: 64 },
                    { width: 64, height: 128 },
                ],
                onChange: () => { this.ScheduleRestart(); },
            });

            this.materialsPanel = new Nitrate.MaterialsPanel({
                activeMaterial: { defaultMaterial: 'blueprint' },
                occupancy: { default: 'static', show: false },
                phases: { show: false },
                tags: { show: false },
            });

            this.brushPanel = new Nitrate.BrushPanel({
                size: { min: 1, max: 10, default: 1 },
                shape: { default: 'square', show: false },
                mode: { default: 'draw' },
                type: { default: 'palette', show: false },
                snap: { default: true, show: false },
            });
        }

        this.scenePanel = new Nitrate.ScenePanel({
            export: { onExport: () => { this.RunExport(); } },
            clear: {
                onClear: () => {
                    this.hierarchy?.Clear();
                    if (this.mode === 'gameobject') {
                        this.hierarchy?.AddHierarchyObject({ components: [Nitrate.PixelData] });
                    } else {
                        this.hierarchy?.AddHierarchyObject({ components: [Nitrate.Blueprint] });
                    }
                    this.InitGPU();
                },
            },
        });
    }

    private TeardownModeSpecific(): void {
        this.DestroyProcess(this.selectionController);
        this.selectionController = null;
        this.DestroyProcess(this.anchorController);
        this.anchorController = null;
        this.DestroyProcess(this.overlayController);
        this.overlayController = null;
        this.DestroyProcess(this.eyedropperController);
        this.eyedropperController = null;
        if (this.gridOverlay) { Nitrate.Renderer.Destroy2D(this.gridOverlay); }
        this.gridOverlay = null;
        this.DestroyProcess(this.renderingPanel);
        this.renderingPanel = null;
        this.DestroyProcess(this.materialsPanel);
        this.materialsPanel = null;
        this.DestroyProcess(this.brushPanel);
        this.brushPanel = null;
        this.DestroyProcess(this.scenePanel);
        this.scenePanel = null;
    }

    private DestroyProcess(p: Nitrate.NitrateProcess | null): void {
        if (!p) { return; }
        p.OnDestroy?.();
        Nitrate.NitrateEngine.Unregister(p);
    }

    private RunExport(): void {
        if (this.mode === 'gameobject') { void this.goExport?.Run(); }
        else { void this.bpExport?.Run(); }
    }

    private async RunImport(filename: string): Promise<void> {
        const meta = await Nitrate.Metadata.Read(filename);
        const targetMode: EditorMode = meta?.type === 'blueprint' ? 'blueprint' : 'gameobject';
        const modeChanging = targetMode !== this.mode;

        if (Nitrate.SceneManager.IsDirty()) {
            const title = modeChanging
                ? `Switch to ${targetMode === 'blueprint' ? 'Blueprint' : 'Game Object'} mode and import?`
                : 'Import Object?';
            const confirmed = await Nitrate.Modal.Confirm({
                title,
                confirmLabel: modeChanging ? 'Switch & Import' : 'Import',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) { return; }
        }

        if (modeChanging) { this.SwitchModeNoInit(targetMode); }

        if (targetMode === 'gameobject') {
            await this.goImport?.Run(filename);
            let editorSize = meta?.editor.size ?? null;
            if (!editorSize) {
                const pd = this.hierarchy?.GetSelectedGameObject()?.GetComponent(Nitrate.PixelData);
                if (pd) { editorSize = { width: pd.size.width, height: pd.size.height }; }
            }
            if (editorSize) { this.renderingPanel?.SetGridSize(editorSize.width, editorSize.height); }
        } else {
            await this.bpImport?.Run(filename);
            let editorSize = meta?.editor.size ?? null;
            if (!editorSize) {
                const bp = this.hierarchy?.GetSelectedGameObject()?.GetComponent(Nitrate.Blueprint);
                if (bp) { editorSize = { width: bp.size.width, height: bp.size.height }; }
            }
            if (editorSize) { this.renderingPanel?.SetGridSize(editorSize.width, editorSize.height); }
        }

        await this.ReinitAndWait();

        if (targetMode === 'gameobject') { this.PaintGameObjectCells(meta?.editor.pos); }
        else { this.PaintBlueprintCells(); }

        this.hierarchy?.Refresh();
    }

    /** Calls InitGPU and resolves once SimulationManager has finished reinitialising. */
    private async ReinitAndWait(): Promise<void> {
        return new Promise<void>((resolve) => {
            const handler = () => {
                Nitrate.NitrateProcess.RemoveInitListener(Nitrate.SimulationManager, handler);
                resolve();
            };
            Nitrate.NitrateProcess.OnInit(Nitrate.SimulationManager, handler);
            this.InitGPU();
        });
    }

    private PaintGameObjectCells(pos?: Nitrate.Vec2): void {
        const go = this.hierarchy?.GetSelectedGameObject();
        if (!go) { return; }
        const pixelData = go.GetComponent(Nitrate.PixelData);
        if (!pixelData) { return; }

        const sim = Nitrate.SimulationManager.Instance;
        const webgpu = Nitrate.Renderer.Instance?.GetWebGPU();
        if (!sim?.pingPong || !webgpu) { return; }

        const { pingPong } = sim;
        const { width: canvasW, height: canvasH } = pingPong;
        const colorsPerMaterial = Nitrate.MaterialVisualSchema.GetColorsPerMaterial();

        const offsetX = pos?.x ?? Math.floor((canvasW - pixelData.size.width) / 2);
        const offsetY = pos?.y ?? Math.floor((canvasH - pixelData.size.height) / 2);

        const identityData = new Uint8Array(canvasW * canvasH * 4);

        for (const cell of pixelData.cells) {
            if (cell.materialId === 0) { continue; }
            const cx = offsetX + cell.pos.x;
            const cy = offsetY + cell.pos.y;
            if (cx < 0 || cx >= canvasW || cy < 0 || cy >= canvasH) { continue; }
            const texY = canvasH - 1 - cy;
            const byteIdx = (texY * canvasW + cx) * 4;
            identityData[byteIdx] = cell.materialId;
            identityData[byteIdx + 1] = Math.round((cell.colorVariant / colorsPerMaterial) * 255);
            identityData[byteIdx + 2] = 0;
            identityData[byteIdx + 3] = 1;
        }

        const layout = { bytesPerRow: canvasW * 4 };
        const textureSize: [number, number] = [canvasW, canvasH];
        webgpu.device.queue.writeTexture({ texture: pingPong.currentIdentity }, identityData, layout, textureSize);
        webgpu.device.queue.writeTexture({ texture: pingPong.nextIdentity }, identityData, layout, textureSize);

        this.selectionController?.SetSelection({
            x1: offsetX,
            y1: offsetY,
            x2: offsetX + pixelData.size.width - 1,
            y2: offsetY + pixelData.size.height - 1,
        });
        this.anchorController?.SetAnchor({
            x: offsetX + pixelData.pivot.x,
            y: offsetY + pixelData.pivot.y,
        });
    }

    private PaintBlueprintCells(): void {
        const go = this.hierarchy?.GetSelectedGameObject();
        if (!go) { return; }
        const blueprint = go.GetComponent(Nitrate.Blueprint);
        if (!blueprint) { return; }

        const sim = Nitrate.SimulationManager.Instance;
        const webgpu = Nitrate.Renderer.Instance?.GetWebGPU();
        if (!sim?.pingPong || !webgpu) { return; }

        const { pingPong } = sim;
        const { width: canvasW, height: canvasH } = pingPong;
        const colorsPerMaterial = Nitrate.MaterialVisualSchema.GetColorsPerMaterial();
        const blueprintId = Nitrate.MaterialRegistry.Materials['blueprint'].id;

        const identityData = new Uint8Array(canvasW * canvasH * 4);

        for (const cell of blueprint.cells) {
            const cx = cell.pos.x;
            const cy = cell.pos.y;
            if (cx < 0 || cx >= canvasW || cy < 0 || cy >= canvasH) { continue; }
            const texY = canvasH - 1 - cy;
            const byteIdx = (texY * canvasW + cx) * 4;
            identityData[byteIdx] = blueprintId;
            identityData[byteIdx + 1] = Math.round((cell.colorVariant / colorsPerMaterial) * 255);
            identityData[byteIdx + 2] = 0;
            identityData[byteIdx + 3] = 2;
        }

        const layout = { bytesPerRow: canvasW * 4 };
        const textureSize: [number, number] = [canvasW, canvasH];
        webgpu.device.queue.writeTexture({ texture: pingPong.currentIdentity }, identityData, layout, textureSize);
        webgpu.device.queue.writeTexture({ texture: pingPong.nextIdentity }, identityData, layout, textureSize);
    }

    private InitGPU(): void {
        const renderer = this.renderer;
        if (!renderer || !this.renderingPanel) { return; }

        const grid = this.renderingPanel.GetGridDimensions();
        const pixel = Nitrate.Utils.ComputeGridPixelSize(grid);

        renderer.SetContainerStyle({
            inset: 'auto',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: pixel.width + 'px',
            height: pixel.height + 'px',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.12)',
        });
        renderer.Resize({ width: grid.width, height: grid.height });
        Object.assign(renderer.canvas.style, { width: pixel.width + 'px', height: pixel.height + 'px' });

        Nitrate.SimulationManager.Instance?.OnResize();

        if (this.mode === 'gameobject') {
            this.selectionController?.Reset();
            this.anchorController?.Reset();
            this.overlayController?.Init(grid.width, pixel.width);
        } else {
            if (this.gridOverlay) { Nitrate.Renderer.Destroy2D(this.gridOverlay); }
            this.gridOverlay = this.CreateGridOverlay(grid, pixel);
        }
    }

    private CreateGridOverlay(gridSize: Nitrate.Size2D, pixelSize: Nitrate.Size2D): Nitrate.Renderer2D {
        const overlay = Nitrate.Renderer.Create2D({
            containerId: 'sim-container',
            canvasId: 'sim-grid',
            size: { width: pixelSize.width, height: pixelSize.height },
            style: {
                display: 'block', position: 'absolute', top: '0', left: '0',
                pointerEvents: 'none', zIndex: '2', background: 'transparent',
            },
        });

        const ctx = overlay.canvas.getContext('2d');
        if (ctx) {
            const cellPxW = pixelSize.width / gridSize.width;
            const cellPxH = pixelSize.height / gridSize.height;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= gridSize.width; x++) {
                const px = x * cellPxW + 0.5;
                ctx.moveTo(px, 0);
                ctx.lineTo(px, pixelSize.height);
            }
            for (let y = 0; y <= gridSize.height; y++) {
                const py = y * cellPxH + 0.5;
                ctx.moveTo(0, py);
                ctx.lineTo(pixelSize.width, py);
            }
            ctx.stroke();
        }

        return overlay;
    }

    private ScheduleRestart(): void {
        if (this.restartHandle !== null) { window.clearTimeout(this.restartHandle); }
        this.restartHandle = window.setTimeout(() => {
            this.restartHandle = null;
            this.InitGPU();
        }, 100);
    }

    public OnDestroy(): void {
        if (this.restartHandle !== null) {
            window.clearTimeout(this.restartHandle);
            this.restartHandle = null;
        }

        this.renderer = null;
        this.modeController = null;
        this.goExport = null;
        this.bpExport = null;
        this.goImport = null;
        this.bpImport = null;
        this.selectionController = null;
        this.anchorController = null;
        this.overlayController = null;
        this.eyedropperController = null;
        this.gridOverlay = null;
        this.hierarchy = null;
        this.brushPanel = null;
        this.materialsPanel = null;
        this.renderingPanel = null;
        this.scenePanel = null;
    }
}
