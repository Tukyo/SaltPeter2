import type { SimulationLayer } from './SimulationLayer';
import type { GameObjectLayer } from '../game_object/GameObjectLayer';

import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface LayerInteractionPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
}

/**
 * GPU compute pass that handles cross-layer interactions between the world simulation
 * and game object layers.
 *
 * Runs after both layers have finished simulating and swapped each step. Dispatches
 * over GameObject layer dimensions — only GameObject-owned pixels are processed.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class LayerInteractionPass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly gameObjectLayer: GameObjectLayer;
    private readonly workgroupSize: number;

    private constructor(
        params: LayerInteractionPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.gameObjectLayer = params.gameObjectLayer;
        this.workgroupSize = workgroupSize;
    }

    /** Compiles the cross-layer shader and returns a ready-to-use pass. @internal */
    public static async Create(params: LayerInteractionPassParams): Promise<LayerInteractionPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: params.device.createShaderModule({
                    code: ShaderAssembler.LayerInteraction(workgroupSize),
                }),
                entryPoint: 'main',
            },
        });
        return new LayerInteractionPass(params, pipeline, workgroupSize);
    }

    /** Encodes a cross-layer compute dispatch into the provided command encoder. @internal */
    public Run(encoder: GPUCommandEncoder): void {
        const { device, simulationLayer, gameObjectLayer } = this;

        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: gameObjectLayer.currentOwnership.createView() },
                { binding: 1, resource: gameObjectLayer.currentIdentity.createView() },
                { binding: 2, resource: simulationLayer.currentIdentity.createView() },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(gameObjectLayer.width / this.workgroupSize),
            Math.ceil(gameObjectLayer.height / this.workgroupSize)
        );
        pass.end();
    }

    public OnDestroy(): void { }
}
