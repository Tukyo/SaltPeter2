import type { Size2D } from '../definitions/Primitives';
import type { SimulationResource } from '../simulation/SimulationManager';

import { MaterialRegistry } from '../materials/MaterialRegistry';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

/**
 * GPU compute pass that counts cells per material ID into a readback buffer.
 * @internal
 */
export class AnalyticsPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly countBuffer: GPUBuffer;
    private readonly readbackBuffer: GPUBuffer;
    private readonly workgroupSize: number;
    private readonly materialCount: number;

    private constructor(
        device: GPUDevice,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = device;
        this.pipeline = pipeline;
        this.materialCount = Object.keys(MaterialRegistry.Materials).length;
        this.workgroupSize = workgroupSize;
        const bufferSize = this.materialCount * 4;
        this.countBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });
        this.readbackBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
    }

    /** Creates and compiles the analytics compute pipeline. */
    static async Create(device: GPUDevice): Promise<AnalyticsPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = device.createShaderModule({
            code: ShaderAssembler.Analytics(workgroupSize),
        });
        const pipeline = await device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new AnalyticsPass(device, pipeline, workgroupSize);
    }

    /** Dispatches the analytics compute pass over the identity texture, writing counts into the count buffer. */
    public Run(encoder: GPUCommandEncoder, identityTexture: GPUTexture, size: Size2D): void {
        this.device.queue.writeBuffer(this.countBuffer, 0, new Uint32Array(this.materialCount));

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: identityTexture.createView() },
                { binding: 1, resource: { buffer: this.countBuffer } },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(size.width / this.workgroupSize),
            Math.ceil(size.height / this.workgroupSize),
        );
        pass.end();
    }

    /** Copies the count buffer to a mappable readback buffer and returns the per-material cell counts. */
    public async ReadAsync(): Promise<Uint32Array> {
        const size = this.materialCount * 4;
        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.countBuffer, 0, this.readbackBuffer, 0, size);
        this.device.queue.submit([encoder.finish()]);

        try {
            await this.readbackBuffer.mapAsync(GPUMapMode.READ, 0, size);
        } catch {
            return new Uint32Array(this.materialCount);
        }
        const data = new Uint32Array(this.readbackBuffer.getMappedRange(0, size).slice(0));
        this.readbackBuffer.unmap();
        return data;
    }

    /** Destroys the GPU buffers. Called automatically by SimulationManager on scene teardown. */
    public Destroy(): void {
        this.countBuffer.destroy();
        this.readbackBuffer.destroy();
    }
}
