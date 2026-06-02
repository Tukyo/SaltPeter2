import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from './Renderer';
import { RenderingLayers } from './RenderingLayers';
import { SimulationManager } from '../simulation/SimulationManager';
import { CompositePass } from './passes/CompositePass';
import { GameObjectRenderPass } from './passes/GameObjectRenderPass';
import { SimulationRenderPass } from './passes/SimulationRenderPass';

/**
 * Drives the forward rendering pipeline each frame.
 *
 * Waits for {@link SimulationManager} to initialize, then creates
 * {@link RenderingLayers} and all render passes. Each `Update` dispatches
 * passes in layer order and composites the results to the canvas.
 *
 * Layer order (bottom → top): GOs → Sim
 */
export class RenderingManager extends NitrateProcess {
    public static Instance: RenderingManager | null = null;

    private layers: RenderingLayers | null = null;
    private simRenderPass: SimulationRenderPass | null = null;
    private gameObjectRenderPass: GameObjectRenderPass | null = null;
    private compositePass: CompositePass | null = null;

    private readonly onSimInit: () => Promise<void>;

    constructor() {
        super();
        RenderingManager.Instance = this;
        this.onSimInit = async () => {
            if (RenderingManager.Instance !== this) { return; }
            await this.Init();
        };
        NitrateProcess.OnInit(SimulationManager, this.onSimInit);
    }

    private async Init(): Promise<void> {
        const renderer = Renderer.Instance?.GetWebGPU();
        const sim = SimulationManager.Instance;
        if (!renderer || !sim?.simulationLayer || !sim?.gameObjectLayer || !sim.materialVisualBuffer) { return; }

        const { device, format } = renderer;
        const { simulationLayer, gameObjectLayer, materialVisualBuffer } = sim;

        this.layers = RenderingLayers.Create(device, { width: simulationLayer.width, height: simulationLayer.height });

        const [simRenderPass, gameObjectRenderPass, compositePass] = await Promise.all([
            SimulationRenderPass.Create({ device, materialVisualBuffer }),
            GameObjectRenderPass.Create({ device, gameObjectLayer, materialVisualBuffer }),
            CompositePass.Create({ device, format }),
        ]);

        this.simRenderPass = simRenderPass;
        this.gameObjectRenderPass = gameObjectRenderPass;
        this.compositePass = compositePass;
    }

    public Update(now: number): void {
        const renderer = Renderer.Instance?.GetWebGPU();
        const sim = SimulationManager.Instance;
        if (!renderer || !sim?.simulationLayer || !this.layers || !this.simRenderPass || !this.gameObjectRenderPass || !this.compositePass) { return; }

        const { device } = renderer;
        const { simulationLayer, gameObjectLayer } = sim;
        if (!gameObjectLayer) { return; }

        const simEnc = device.createCommandEncoder();
        this.simRenderPass.Run({ encoder: simEnc, simulationLayer, layers: this.layers });
        device.queue.submit([simEnc.finish()]);

        const goEnc = device.createCommandEncoder();
        this.gameObjectRenderPass.Run({ encoder: goEnc, gameObjectLayer, layers: this.layers });
        device.queue.submit([goEnc.finish()]);

        const compositeEnc = device.createCommandEncoder();
        this.compositePass.Run({
            encoder: compositeEnc,
            swapchainView: renderer.context.getCurrentTexture().createView(),
            layers: this.layers,
            canvasSize: { width: renderer.canvas.width, height: renderer.canvas.height },
        });
        device.queue.submit([compositeEnc.finish()]);
    }

    public OnResize(): void {
        this.layers?.Destroy();
        this.layers = null;
        this.simRenderPass = null;
        this.gameObjectRenderPass?.Destroy();
        this.gameObjectRenderPass = null;
        this.compositePass = null;
    }

    public OnDestroy(): void {
        NitrateProcess.RemoveInitListener(SimulationManager, this.onSimInit);
        this.layers?.Destroy();
        this.layers = null;
        this.simRenderPass = null;
        this.gameObjectRenderPass?.Destroy();
        this.gameObjectRenderPass = null;
        this.compositePass = null;
        if (RenderingManager.Instance === this) { RenderingManager.Instance = null; }
    }
}
