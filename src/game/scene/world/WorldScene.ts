import { Nitrate } from '@Nitrate';

export class WorldScene extends Nitrate.Scene {
    private renderer: Nitrate.RendererWebGPU | null = null;

    public async Init(): Promise<void> {
        this.renderer = await Nitrate.Renderer.CreateWebGPU({
            containerId: 'sim-container',
            canvasId: 'sim-canvas',
            size: { width: window.innerWidth, height: window.innerHeight },
            style: { display: 'block', cursor: 'pointer', background: '#111' },
        });

        new Nitrate.LogManager({
            quiet: true,
            showTimestamps: true
        });

        new Nitrate.WindowManager();
        new Nitrate.Input(this.renderer.canvas);
        new Nitrate.BrushPreview();

        new Nitrate.Camera();
        new Nitrate.World();

        // Sim | Rendering
        new Nitrate.SimulationManager();
        new Nitrate.RenderingManager();
        new Nitrate.BrushManager();

        // User Interface
        new Nitrate.UserInterfaceManager();
        new Nitrate.DebugPanel();
        new Nitrate.BrushPanel({
            size: { min: 1, max: 50, default: 6 },
            density: { min: 0, max: 100, default: 90 },
            shape: { default: 'circle' },
            mode: { default: 'draw' },
            type: { default: 'noise' }
        });
        new Nitrate.MaterialsPanel({ activeMaterial: { defaultMaterial: 'sand' } });
        new Nitrate.ScenePanel();
        new Nitrate.AnalyticsOverlay();
        new Nitrate.DebugOverlay();
    }

    public Update(now: number): void { }

    public OnDestroy(): void {
        this.renderer = null;
    }
}
