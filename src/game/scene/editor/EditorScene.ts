import { Nitrate } from '@Nitrate';

import type { EditorMode } from './scripts/EditorModeController';

import { AnchorController } from './scripts/AnchorController';
import { BlueprintController } from './scripts/BlueprintController';
import { EditorModeController } from './scripts/EditorModeController';
import { EyedropperController } from './scripts/EyedropperController';
import { OverlayController } from './scripts/OverlayController';
import { PlayerScaleController } from './scripts/PlayerScaleController';
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
    private blueprintController: BlueprintController | null = null;
    private eyedropperController: EyedropperController | null = null;
    private playerScaleController: PlayerScaleController | null = null;
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

        new Nitrate.ScreenshotManager();

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
            this.hierarchy?.AddHierarchyObject({});

            this.selectionController = new SelectionController(renderer.canvas);
            this.anchorController = new AnchorController(renderer.canvas, this.selectionController);
            this.overlayController = new OverlayController(this.selectionController, this.anchorController);

            this.goExport?.SetSelectionProvider(() => this.selectionController?.GetNormalizedSelection() ?? null);
            this.goExport?.SetAnchorProvider(() => this.anchorController?.GetAnchorCell() ?? null);
            this.goExport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);
            this.goImport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);

            Nitrate.BrushManager.Instance
                ? (Nitrate.BrushManager.Instance.onFirstPaint = () => this.EnsurePixelData())
                : Nitrate.NitrateProcess.OnInit(Nitrate.BrushManager, () => {
                    if (Nitrate.BrushManager.Instance) {
                        Nitrate.BrushManager.Instance.onFirstPaint = () => this.EnsurePixelData();
                    }
                });

            this.renderingPanel = new Nitrate.RenderingPanel({
                type: 'grid',
                sizes: [
                    { width: 32, height: 32 },
                    { width: 64, height: 64 },
                    { width: 128, height: 128 },
                    { width: 256, height: 256 },
                ],
                style: { top: '57px', right: '14px' },
                collapsed: false,
                onChange: () => { this.ScheduleRestart(); },
            });

            this.materialsPanel = new Nitrate.MaterialsPanel({
                activeMaterial: { defaultMaterial: 'sand' },
                occupancy: { default: 'static' },
                style: { top: '698px', height: '445px' }
            });

            this.brushPanel = new Nitrate.BrushPanel({
                size: { min: 1, max: 10, default: 1 },
                shape: { default: 'square' },
                mode: { default: 'fill' },
                type: { default: 'palette' },
                snap: { default: true, show: false },
                style: { top: '187px', height: '502px' }
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

            this.overlayController = new OverlayController(null, null);
            this.blueprintController = new BlueprintController();
            this.playerScaleController = new PlayerScaleController();

            this.bpExport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);
            this.bpImport?.SetGameObjectProvider(() => this.hierarchy?.GetSelectedGameObject() ?? null);

            this.renderingPanel = new Nitrate.RenderingPanel({
                type: 'grid',
                sizes: [ // Padding of 4px on each side for overlay margins and connection authoring
                    { width: 264, height: 136 },
                    { width: 136, height: 264 }
                ],
                style: { top: '57px' },
                collapsed: false,
                onChange: () => { this.ScheduleRestart(); },
            });

            this.materialsPanel = new Nitrate.MaterialsPanel({
                activeMaterial: { defaultMaterial: 'blueprint', filter: 'blueprint' },
                occupancy: { default: 'static', show: false },
                phases: { show: false },
                tags: { show: false },
                variants: { filter: ['default', 'powder', 'liquid', 'gas', 'detail'] },
                style: { top: '636px', height: '270px' }
            });

            this.brushPanel = new Nitrate.BrushPanel({
                size: { min: 1, max: 64, default: 1 },
                shape: { default: 'square', show: false },
                mode: { default: 'mask' },
                type: { default: 'palette' },
                snap: { default: true, show: false },
                style: { top: '188px', height: '439px' }
            });
        }

        const scenePanelTop = this.mode === 'gameobject' ? '1153px' : '916px';
        this.scenePanel = new Nitrate.ScenePanel({
            export: { onExport: () => { this.RunExport(); } },
            clear: {
                onClear: () => {
                    this.hierarchy?.Clear();
                    if (this.mode === 'gameobject') {
                        this.hierarchy?.AddHierarchyObject({});
                    } else {
                        this.hierarchy?.AddHierarchyObject({ components: [Nitrate.Blueprint] });
                    }
                    this.InitGPU();
                },
            },
            style: { top: scenePanelTop }
        });
    }

    private EnsurePixelData(): void {
        const go = this.hierarchy?.GetSelectedGameObject();
        if (!go || go.GetComponent(Nitrate.PixelData)) { return; }
        go.AddComponent(Nitrate.PixelData);
        this.hierarchy?.Refresh();
    }

    private TeardownModeSpecific(): void {
        if (Nitrate.BrushManager.Instance) { Nitrate.BrushManager.Instance.onFirstPaint = null; }
        this.DestroyProcess(this.selectionController);
        this.selectionController = null;
        this.DestroyProcess(this.anchorController);
        this.anchorController = null;
        this.DestroyProcess(this.overlayController);
        this.overlayController = null;
        this.DestroyProcess(this.blueprintController);
        this.blueprintController = null;
        this.DestroyProcess(this.playerScaleController);
        this.playerScaleController = null;
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

    private async RunExport(): Promise<void> {
        const go = this.hierarchy?.GetSelectedGameObject() ?? null;
        if (!go?.name.trim()) {
            Nitrate.NotificationManager.Instance?.Notify({
                message: 'Enter a name for the GameObject before exporting.',
                level: 'error',
                duration: 4000,
            });
            return;
        }

        if (this.mode === 'gameobject') {
            const hasPixelData = !!go.GetComponent(Nitrate.PixelData);
            const hasSelection = !!this.selectionController?.GetNormalizedSelection();
            if (hasPixelData && !hasSelection) {
                Nitrate.NotificationManager.Instance?.Notify({
                    message: 'No bounding box. Shift+Click and drag around the desired area to export.',
                    level: 'error',
                    duration: 4000,
                });
                return;
            }
            if (!hasPixelData && hasSelection) {
                Nitrate.NotificationManager.Instance?.Notify({
                    message: 'No PixelData component found. A GameObject with pixels requires a PixelData component.',
                    level: 'error',
                    duration: 4000,
                });
                return;
            }
            if (hasSelection && !this.anchorController?.GetAnchorCell()) {
                Nitrate.NotificationManager.Instance?.Notify({
                    message: 'No anchor set. Ctrl+Click within the bounding box to add an anchor.',
                    level: 'error',
                    duration: 4000,
                });
                return;
            }
        }

        const success = this.mode === 'gameobject'
            ? await this.goExport?.Run()
            : await this.bpExport?.Run();

        if (success) {
            Nitrate.NotificationManager.Instance?.Notify({
                message: `'${go.name}' exported successfully.`,
                level: 'success',
                duration: 4000,
                action: { label: 'Show in folder', onClick: () => { void window.api.shell.showAsset(success); } },
            });
        } else {
            Nitrate.NotificationManager.Instance?.Notify({
                message: 'Export failed. Check the console for details.',
                level: 'error',
                duration: 6000,
            });
        }
    }

    private async RunImport(filename: string): Promise<void> {
        const meta = await Nitrate.Metadata.Read(filename);
        const targetMode: EditorMode = meta?.type === 'blueprint' ? 'blueprint' : 'gameobject';
        const modeChanging = targetMode !== this.mode;

        if (Nitrate.SceneManager.IsDirty()) {
            const title = modeChanging
                ? `Switch to ${targetMode === 'blueprint' ? 'Blueprint' : 'Game Object'} mode and import?`
                : 'Import Object? All unsaved edits will be lost!';
            const confirmed = await Nitrate.Modal.Confirm({
                title,
                confirmLabel: modeChanging ? 'Switch & Import' : 'Import',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) { return; }
        }

        if (modeChanging) { this.SwitchModeNoInit(targetMode); }

        if (targetMode === 'gameobject') {
            const imported = await this.goImport?.Run(filename) ?? false;
            if (!imported) {
                Nitrate.NotificationManager.Instance?.Notify({
                    message: 'Import failed. Check the console for details.',
                    level: 'error',
                    duration: 6000,
                });
                return;
            }
            let editorSize = meta?.editor.size ?? null;
            if (!editorSize) {
                const pd = this.hierarchy?.GetSelectedGameObject()?.GetComponent(Nitrate.PixelData);
                if (pd) { editorSize = { width: pd.size.width, height: pd.size.height }; }
            }
            if (editorSize) { this.renderingPanel?.SetGridSize(editorSize.width, editorSize.height); }
        } else {
            const imported = await this.bpImport?.Run(filename) ?? false;
            if (!imported) {
                Nitrate.NotificationManager.Instance?.Notify({
                    message: 'Import failed. Check the console for details.',
                    level: 'error',
                    duration: 6000,
                });
                return;
            }
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
        Nitrate.SceneManager.MarkDirty();

        const importedName = this.hierarchy?.GetSelectedGameObject()?.name ?? null;
        Nitrate.NotificationManager.Instance?.Notify({
            message: importedName ? `'${importedName}' imported successfully.` : 'Imported successfully.',
            level: 'success',
            duration: 4000,
        });
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
        if (!sim?.simulationLayer || !webgpu) { return; }

        const { simulationLayer } = sim;
        const { width: canvasW, height: canvasH } = simulationLayer;
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
            identityData[byteIdx + 2] = cell.variantId;
            identityData[byteIdx + 3] = cell.occupancy ?? 2;
        }

        const layout = { bytesPerRow: canvasW * 4 };
        const textureSize: [number, number] = [canvasW, canvasH];
        webgpu.device.queue.writeTexture({ texture: simulationLayer.currentIdentity }, identityData, layout, textureSize);
        webgpu.device.queue.writeTexture({ texture: simulationLayer.nextIdentity }, identityData, layout, textureSize);

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
        if (!sim?.simulationLayer || !webgpu) { return; }

        const { simulationLayer } = sim;
        const { width: canvasW, height: canvasH } = simulationLayer;
        const colorsPerMaterial = Nitrate.MaterialVisualSchema.GetColorsPerMaterial();
        const blueprintId = Nitrate.MaterialRegistry.Materials['blueprint'].id;

        const identityData = new Uint8Array(canvasW * canvasH * 4);

        for (const cell of blueprint.cells) {
            const cx = cell.pos.x;
            const cy = cell.pos.y;
            if (cx < 0 || cx >= canvasW || cy < 0 || cy >= canvasH) { continue; }
            const byteIdx = (cy * canvasW + cx) * 4;
            const variantId = Nitrate.MaterialQuery.GetVariantId(blueprintId, cell.type) ?? 0;
            identityData[byteIdx] = blueprintId;
            identityData[byteIdx + 1] = Math.round((cell.colorIndex + 0.5) / colorsPerMaterial * 255);
            identityData[byteIdx + 2] = variantId;
            identityData[byteIdx + 3] = 2;
        }

        const paintZone = (bounds: Nitrate.Rect2D, variantId: number): void => {
            for (let cy = bounds.y1; cy < bounds.y2; cy++) {
                for (let cx = bounds.x1; cx < bounds.x2; cx++) {
                    const byteIdx = (cy * canvasW + cx) * 4;
                    identityData[byteIdx] = blueprintId;
                    identityData[byteIdx + 1] = 0;
                    identityData[byteIdx + 2] = variantId;
                    identityData[byteIdx + 3] = 2;
                }
            }
        };

        for (const { bounds, key } of Nitrate.BlueprintLayout.GetEdgeZones(canvasW, canvasH)) {
            const variantName = blueprint.edges[key];
            if (!variantName) { continue; }
            const variantId = Nitrate.MaterialQuery.GetVariantId(blueprintId, variantName) ?? 0;
            if (variantId === 0) { continue; }
            paintZone(bounds, variantId);
        }

        const gpuLayout = { bytesPerRow: canvasW * 4 };
        const textureSize: [number, number] = [canvasW, canvasH];
        webgpu.device.queue.writeTexture({ texture: simulationLayer.currentIdentity }, identityData, gpuLayout, textureSize);
        webgpu.device.queue.writeTexture({ texture: simulationLayer.nextIdentity }, identityData, gpuLayout, textureSize);
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
            this.overlayController?.Init(grid, pixel);
        } else {
            if (this.gridOverlay) { Nitrate.Renderer.Destroy2D(this.gridOverlay); }
            this.gridOverlay = this.CreateGridOverlay(grid, pixel);
            this.overlayController?.Init(grid, pixel);
            this.overlayController?.SetBlueprintGuide(grid);
            this.playerScaleController?.Init(grid, pixel);
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
        this.playerScaleController = null;
        this.gridOverlay = null;
        this.hierarchy = null;
        this.brushPanel = null;
        this.materialsPanel = null;
        this.renderingPanel = null;
        this.scenePanel = null;
    }
}
