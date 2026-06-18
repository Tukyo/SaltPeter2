import { CompositePass } from './passes/CompositePass';
import { GameObjectRenderPass } from './passes/GameObjectRenderPass';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { ParticleRenderPass } from './passes/ParticleRenderPass';
import { Renderer } from './Renderer';
import { RenderingLayers } from './RenderingLayers';
import { SimulationManager } from '../simulation/SimulationManager';
import { SimulationRenderPass } from './passes/SimulationRenderPass';

/**
 * Drives the forward rendering pipeline each frame.
 *
 * Waits for {@link SimulationManager} to initialize, then creates
 * {@link RenderingLayers} and all render passes. Each `Update` dispatches
 * passes in layer order and composites the results to the canvas.
 */
export class RenderingManager extends NitrateProcess {
    public static Instance: RenderingManager | null = null;

    private layers: RenderingLayers | null = null;
    private simRenderPass: SimulationRenderPass | null = null;
    private gameObjectRenderPass: GameObjectRenderPass | null = null;
    private particleRenderPass: ParticleRenderPass | null = null;
    private compositePass: CompositePass | null = null;

    private readonly onSimInit: () => Promise<void>;

    constructor() {
        super();
        this.Register();
        
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
        if (!renderer || !sim?.simulationLayer || !sim?.gameObjectLayer || !sim.materialVisualBuffer) {
            LogManager.Instance?.LogWarning({
                text: 'RenderingManager init skipped: missing renderer or simulation layer.',
                options: { tags: ['Rendering'] }
            });
            return;
        }

        const { device, format } = renderer;
        const { simulationLayer, gameObjectLayer, materialVisualBuffer, particleBuffer, particleDefinitionBuffer } = sim;
        if (!particleBuffer || !particleDefinitionBuffer) {
            LogManager.Instance?.LogWarning({
                text: 'RenderingManager init skipped: missing particle buffer.',
                options: { tags: ['Rendering'] }
            });
            return;
        }

        this.layers = RenderingLayers.Create(device, { width: simulationLayer.width, height: simulationLayer.height });

        const [simRenderPass, gameObjectRenderPass, particleRenderPass, compositePass] = await Promise.all([
            SimulationRenderPass.Create({ device, materialVisualBuffer }),
            GameObjectRenderPass.Create({ device, gameObjectLayer, materialVisualBuffer }),
            ParticleRenderPass.Create({ device, particleBuffer, particleDefinitionBuffer, materialVisualBuffer }),
            CompositePass.Create({ device, format }),
        ]);

        this.simRenderPass = simRenderPass;
        this.gameObjectRenderPass = gameObjectRenderPass;
        this.particleRenderPass = particleRenderPass;
        this.compositePass = compositePass;

        LogManager.Instance?.Log({
            text: 'RenderingManager initialized.',
            options: { tags: ['Rendering', 'NitrateProcessInit'] }
        });
    }

    public Update(): void {
        const renderer = Renderer.Instance?.GetWebGPU();
        const sim = SimulationManager.Instance;
        if (!renderer || !sim?.simulationLayer || !this.layers || !this.simRenderPass || !this.gameObjectRenderPass || !this.particleRenderPass || !this.compositePass) { return; }

        const { device } = renderer;
        const { simulationLayer, gameObjectLayer } = sim;
        if (!gameObjectLayer) { return; }

        const simEnc = device.createCommandEncoder();
        this.simRenderPass.Run({ encoder: simEnc, simulationLayer, layers: this.layers });
        device.queue.submit([simEnc.finish()]);

        const goEnc = device.createCommandEncoder();
        this.gameObjectRenderPass.Run({ encoder: goEnc, gameObjectLayer, layers: this.layers });
        device.queue.submit([goEnc.finish()]);

        const particleEnc = device.createCommandEncoder();
        this.particleRenderPass.Run({ encoder: particleEnc, layers: this.layers });
        device.queue.submit([particleEnc.finish()]);

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
        this.particleRenderPass?.Destroy();
        this.particleRenderPass = null;
        this.compositePass = null;
        LogManager.Instance?.Log({
            text: 'RenderingManager OnResize.',
            options: { tags: ['Resize', 'GameObject'] }
        });
    }

    public OnDestroy(): void {
        NitrateProcess.RemoveInitListener(SimulationManager, this.onSimInit);
        this.layers?.Destroy();
        this.layers = null;
        this.simRenderPass = null;
        this.gameObjectRenderPass?.Destroy();
        this.gameObjectRenderPass = null;
        this.particleRenderPass?.Destroy();
        this.particleRenderPass = null;
        this.compositePass = null;
        if (RenderingManager.Instance === this) {
            RenderingManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared RenderingManager singleton instance.',
                options: { tags: ['Rendering', 'NitrateProcessDestroy'] }
            });
        }
    }
}
