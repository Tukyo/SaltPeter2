import { Nitrate } from '@Nitrate';

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
            showTimestamps: true,
            filterMode: 'allowlist',
            filters: ['Sim']
        });

        new Nitrate.WindowManager();
        new Nitrate.Input(this.renderer.canvas);
        new Nitrate.BrushPreview();

        new Nitrate.GameObjectManager();
        new Nitrate.SimulationManager();
        new Nitrate.RenderingManager();
        new Nitrate.BrushManager();

        new Nitrate.UserInterfaceManager();

        // new Nitrate.Hierarchy();
        // new Nitrate.Resources();

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
            size: { min: 1, max: 50, default: 6 },
            density: { min: 0, max: 100, default: 90 },
            shape: { default: 'circle' },
            mode: { default: 'draw' },
            type: { default: 'noise' }
        });
        new Nitrate.MaterialsPanel({ activeMaterial: { defaultMaterial: 'sand' } });
        new Nitrate.ScenePanel({clear: {}});

        new Nitrate.AnalyticsOverlay();
        new Nitrate.DebugOverlay();

        // TEST - Specific amount of GOs
        // TODO: remove hardcoded spawn — replace with resources panel drag-and-drop
        // Nitrate.NitrateProcess.OnInit(Nitrate.SimulationManager, async () => {
        //     await Nitrate.GameObject.Instantiate('53720933-b597-4b87-952e-7bc6ebba9c9c', { x: 100, y: 300 });
        //     await Nitrate.GameObject.Instantiate('53720933-b597-4b87-952e-7bc6ebba9c9c', { x: 100, y: 400 });
        // });

        // TEST - Many GOs
        // Nitrate.NitrateProcess.OnInit(Nitrate.SimulationManager, async () => {
        //     const spawnCount: number = 100;
        //     const spawnedObjects: Nitrate.GameObject[] = [];

        //     for (let i: number = 0; i < spawnCount; i++) {
        //         const randomX: number = Math.random() * window.innerWidth;
        //         const randomY: number = Math.random() * window.innerHeight;

        //         const gameObject = await Nitrate.GameObject.Instantiate(
        //             '480e1cf8-3571-4761-84d8-2647754bc63e',
        //             {
        //                 x: randomX,
        //                 y: randomY
        //             }
        //         );

        //         if (!gameObject) continue;
        //         spawnedObjects.push(gameObject);
        //     }
        // });
    }

    public Update(now: number): void { }

    public OnDestroy(): void {
        this.renderer = null;
    }
}
