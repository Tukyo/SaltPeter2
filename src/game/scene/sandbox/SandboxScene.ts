import { Nitrate } from '@Nitrate';

import { GameObjectPlacementController } from './scripts/GameObjectPlacementController';

export class SandboxScene extends Nitrate.Scene {
    private renderer: Nitrate.RendererWebGPU | null = null;

    public async Init(): Promise<void> {
        this.renderer = await Nitrate.Renderer.CreateWebGPU({
            containerId: 'sim-container',
            canvasId: 'sim-canvas',
            size: { width: window.innerWidth, height: window.innerHeight },
            style: { display: 'block', cursor: 'none', background: '#111' },
        });

        new Nitrate.LogManager({
            quiet: true,
            showTimestamps: true
        });

        new Nitrate.WindowManager();
        new Nitrate.Input(this.renderer.canvas);
        new Nitrate.BrushPreview();

        new Nitrate.GameObjectManager();
        new Nitrate.SimulationManager();
        new Nitrate.RenderingManager();
        new Nitrate.BrushManager();

        new Nitrate.UserInterfaceManager();
        new GameObjectPlacementController(this.renderer.canvas);

        new Nitrate.Resources({
            style: { top: '14px', left: '14px', width: '300px', height: '200px' },
            previewPanel: { style: { top: '223px', left: '14px', width: '170px', height: '190px' } },
        });

        new Nitrate.DebugPanel();
        new Nitrate.RenderingPanel({
            type: 'scaled',
            resolution: [
                { value: 0 },
                { value: 1080 },
                { value: 720 },
                { value: 540 },
                { value: 360 },
            ],
            scale: {
                min: 25,
                max: 100,
                default: 25,
                step: 5
            }
        });
        new Nitrate.SimulationPanel();
        new Nitrate.BrushPanel({
            size: { min: 1, max: 512, default: 8 },
            density: { min: 0, max: 100, default: 90 },
            shape: { default: 'circle' },
            mode: { default: 'fill' },
            type: { default: 'noise' }
        });
        new Nitrate.MaterialsPanel({ activeMaterial: { defaultMaterial: 'sand' } });
        new Nitrate.ScenePanel({ clear: {} });

        new Nitrate.ScreenshotManager();

        new Nitrate.AnalyticsOverlay();
        new Nitrate.DebugOverlay();
    }

    public Update(now: number): void { }

    public OnDestroy(): void {
        this.renderer = null;
    }
}
