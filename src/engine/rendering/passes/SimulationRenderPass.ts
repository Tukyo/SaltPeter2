import type { MaterialVisualBuffer } from '../../materials/MaterialVisualBuffer';
import type { PingPongTargets } from '../../simulation/PingPongTargets';
import type { RenderingLayers } from '../RenderingLayers';

import { ShaderAssembler } from '../../shaders/ShaderAssembler';
import { SimulationConfig } from '../../config/SimulationConfig';

interface SimulationRenderPassCreateParams {
    device: GPUDevice;
    materialVisualBuffer: MaterialVisualBuffer;
}

interface SimulationRenderPassRunParams {
    encoder: GPUCommandEncoder;
    targets: PingPongTargets;
    layers: RenderingLayers;
}

/**
 * Resolves the simulation identity texture into RGBA color for the sim layer.
 *
 * Reads `currentIdentity` and the material visual buffer, writes resolved per-pixel
 * RGBA into {@link RenderingLayers.simTexture}. Run once per frame before
 * {@link CompositePass}. Does not touch physics, state, or ownership textures.
 *
 * Created and owned by {@link SimulationManager}. Do not call directly.
 */
export class SimulationRenderPass {
    private readonly device: GPUDevice;
    private readonly materialVisualBuffer: MaterialVisualBuffer;
    private readonly pipeline: GPUComputePipeline;
    private readonly workgroupSize: number;

    private constructor(
        params: SimulationRenderPassCreateParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.materialVisualBuffer = params.materialVisualBuffer;
        this.pipeline = pipeline;
        this.workgroupSize = workgroupSize;
    }

    /** Compiles the sim render shader and returns a ready-to-use pass. @internal */
    public static async Create(
        params: SimulationRenderPassCreateParams
    ): Promise<SimulationRenderPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: params.device.createShaderModule({
                    code: ShaderAssembler.SimulationRender(workgroupSize),
                }),
                entryPoint: 'main',
            },
        });
        return new SimulationRenderPass(params, pipeline, workgroupSize);
    }

    /** Writes resolved RGBA sim colors into `layers.simTexture`. @internal */
    public Run(params: SimulationRenderPassRunParams): void {
        const { encoder, targets, layers } = params;

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: targets.currentIdentity.createView() },
                { binding: 1, resource: { buffer: this.materialVisualBuffer.buffer } },
                { binding: 2, resource: layers.simTexture.createView() },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(targets.width / this.workgroupSize),
            Math.ceil(targets.height / this.workgroupSize)
        );
        pass.end();
    }
}
