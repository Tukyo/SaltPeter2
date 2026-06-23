import { Nitrate } from '@Nitrate';

import { CameraController } from '../../scripts/CameraController';

export class WorldScene extends Nitrate.Scene {
    public async InitRenderer(): Promise<Nitrate.RendererWebGPU> {
        return await Nitrate.Renderer.CreateWebGPU({
            containerId: 'sim-container',
            canvasId: 'sim-canvas',
            size: { width: window.innerWidth, height: window.innerHeight },
            style: { display: 'block', cursor: 'crosshair', background: '#111' },
        });
    }

    public Awake(): void {
        new Nitrate.LogManager({
            quiet: true,
            showTimestamps: true
        });

        new Nitrate.WindowManager();
        new Nitrate.Input();

        new Nitrate.World();
        new Nitrate.GameObjectManager();

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

    public Start(): void {
        void this.SpawnScene();
    }

    private async SpawnScene(): Promise<void> {
        const cameraGO = await Nitrate.GameObject.Instantiate(
            '6aa2a46f-f80c-4f64-85fd-627c4f04f9e4',
            { x: 50, y: 250 }
        );
        const cameraController = cameraGO?.GetComponent(CameraController) ?? null;

        const player = await Nitrate.GameObject.Instantiate(
            '6516acf0-200f-49d0-b28d-317cae59a147',
            { x: 50, y: 250 }
        );
        if (!player) { return; }

        const playerTransform = player.GetComponent(Nitrate.Transform);
        if (playerTransform && cameraController) {
            cameraController.SetFollowTarget(playerTransform);
        }
    }

    public Update(): void { }

    public OnDestroy(): void { }
}
