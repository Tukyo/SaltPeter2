import { Nitrate } from '@Nitrate';

export class WorldScene extends Nitrate.Scene {
    public async InitRenderer(): Promise<Nitrate.RendererWebGPU> {
        return await Nitrate.Renderer.CreateWebGPU({
            containerId: 'sim-container',
            canvasId: 'sim-canvas',
            size: { width: window.innerWidth, height: window.innerHeight },
            style: { display: 'block', cursor: 'pointer', background: '#111' },
        });
    }

    public Awake(): void {
        new Nitrate.LogManager({
            quiet: true,
            showTimestamps: true
        });

        new Nitrate.WindowManager();
        new Nitrate.Input();

        new Nitrate.Camera();

        new Nitrate.World();

        // Sim | Rendering
        new Nitrate.SimulationManager();
        new Nitrate.RenderingManager();

        // User Interface
        new Nitrate.UserInterfaceManager();
        new Nitrate.DebugPanel({ collapsed: false });
        new Nitrate.ScenePanel({ style: { top: '210px ' } });
        new Nitrate.AnalyticsOverlay();
        new Nitrate.DebugOverlay();
    }

    public Update(): void { }

    public OnDestroy(): void { }
}
