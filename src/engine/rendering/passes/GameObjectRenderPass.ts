import type { MaterialVisualBuffer } from '../../materials/MaterialVisualBuffer';
import type { RenderingLayers } from '../RenderingLayers';

import { GameObjectConfig } from '../../config/GameObjectConfig';
import { ShaderAssembler } from '../../shaders/ShaderAssembler';
import { SimulationConfig } from '../../config/SimulationConfig';

interface GameObjectRenderPassCreateParams {
    device: GPUDevice;
    stateBuffer: GPUBuffer;
    cellBuffer: GPUBuffer;
    materialVisualBuffer: MaterialVisualBuffer;
}

interface GameObjectRenderPassRunParams {
    encoder: GPUCommandEncoder;
    layers: RenderingLayers;
}

/**
 * Writes GO cell colors into {@link RenderingLayers.gameObjectsTexture} for the FRP GO layer.
 *
 * One thread per GO slot. Iterates each cell, computes its world position using the same
 * rotation math as the stamp pass, and writes the cell's material color unconditionally —
 * no occupancy check. {@link RenderingLayers.gameObjectsTexture} is cleared before this runs
 * so ghost pixels from previous frames are removed.
 *
 * Created and owned by {@link RenderingManager}. Do not call directly.
 */
export class GameObjectRenderPass {
    private readonly device: GPUDevice;
    private readonly stateBuffer: GPUBuffer;
    private readonly cellBuffer: GPUBuffer;
    private readonly materialVisualBuffer: MaterialVisualBuffer;
    private readonly pipeline: GPUComputePipeline;
    private readonly uniformBuffer: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: GameObjectRenderPassCreateParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.stateBuffer = params.stateBuffer;
        this.cellBuffer = params.cellBuffer;
        this.materialVisualBuffer = params.materialVisualBuffer;
        this.pipeline = pipeline;
        this.workgroupSize = workgroupSize;
        this.uniformBuffer = params.device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the GO render shader and returns a ready-to-use pass. @internal */
    public static async Create(
        params: GameObjectRenderPassCreateParams
    ): Promise<GameObjectRenderPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: params.device.createShaderModule({
                    code: ShaderAssembler.GameObjectRender(workgroupSize),
                }),
                entryPoint: 'main',
            },
        });
        return new GameObjectRenderPass(params, pipeline, workgroupSize);
    }

    /** Writes GO cell colors into `layers.gameObjectsTexture`. @internal */
    public Run(params: GameObjectRenderPassRunParams): void {
        const { encoder, layers } = params;
        const { maxGameObjectCount } = GameObjectConfig.GetConfig().performance;

        this.device.queue.writeBuffer(
            this.uniformBuffer, 0,
            new Uint32Array([layers.size.width, layers.size.height, maxGameObjectCount])
        );

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.stateBuffer } },
                { binding: 1, resource: { buffer: this.cellBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.materialVisualBuffer.buffer } },
                { binding: 4, resource: layers.gameObjectsTexture.createView() },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(maxGameObjectCount / this.workgroupSize));
        pass.end();
    }

    // @omitfromdocs
    public Destroy(): void {
        this.uniformBuffer.destroy();
    }
}
