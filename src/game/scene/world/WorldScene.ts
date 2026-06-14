import { Nitrate } from '@Nitrate';

// TODO: Remove this once you get the scale of the world fleshed out
import { PlayerScaleController } from '../editor/scripts/PlayerScaleController';

export class WorldScene extends Nitrate.Scene {
    private renderer: Nitrate.RendererWebGPU | null = null;
    private playerScaleController: PlayerScaleController | null = null; // TODO: Remove this once you get the scale of the world fleshed out

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

        new Nitrate.Camera();

        new Nitrate.World();

        // Sim | Rendering
        new Nitrate.SimulationManager();
        new Nitrate.RenderingManager();

        // TODO: Remove this once you get the scale of the world fleshed out
        Nitrate.NitrateProcess.OnInit(Nitrate.SimulationManager, () => {
            const sim = Nitrate.SimulationManager.Instance;
            const canvas = this.renderer?.canvas;
            if (!sim || !canvas) { return; }
            const scale = sim.state.GetResolutionScale();
            const grid = {
                width: Math.round(canvas.width * scale),
                height: Math.round(canvas.height * scale),
            };
            this.playerScaleController = new PlayerScaleController();
            this.playerScaleController.Init(grid, { width: canvas.clientWidth, height: canvas.clientHeight });
        });

        // User Interface
        new Nitrate.UserInterfaceManager();
        new Nitrate.DebugPanel({ collapsed: false });
        new Nitrate.ScenePanel({ style: { top: '210px ' } });
        new Nitrate.AnalyticsOverlay();
        new Nitrate.DebugOverlay();
    }

    public Update(now: number): void { }

    public OnDestroy(): void {
        this.playerScaleController?.OnDestroy(); // TODO: Remove this once you get the scale of the world fleshed out
        this.playerScaleController = null; // TODO: Remove this once you get the scale of the world fleshed out
        this.renderer = null;
    }
}
