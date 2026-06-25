import type { ParticleBuffer } from '../../particle/ParticleBuffer';
import type { ParticleDefinitionBuffer } from '../../particle/ParticleDefinitionBuffer';
import type { MaterialVisualBuffer } from '../../materials/MaterialVisualBuffer';
import type { RenderingLayers } from '../RenderingLayers';

import { ShaderAssembler } from '../../shaders/ShaderAssembler';
import { SimulationConfig } from '../../config/SimulationConfig';
import { ParticleConfig } from '../../config/ParticleConfig';

interface ParticleRenderPassCreateParams {
    device: GPUDevice;
    particleBuffer: ParticleBuffer;
    particleDefinitionBuffer: ParticleDefinitionBuffer;
    materialVisualBuffer: MaterialVisualBuffer;
}

interface ParticleRenderPassRunParams {
    encoder: GPUCommandEncoder;
    layers: RenderingLayers;
    simOriginX: number;
    simOriginY: number;
}

/**
 * Resolves live particle positions into RGBA pixels on the particle layer texture.
 *
 * Clears {@link RenderingLayers.particleTexture} each frame, then dispatches one
 * thread per particle slot. Active particles scatter-write a single pixel at their
 * current position, sourcing color from {@link ParticleDefinitionBuffer} visual params
 * (material lookup or raw RGBA). Inactive slots are skipped.
 *
 * Created and owned by {@link RenderingManager}. Do not call directly.
 */
export class ParticleRenderPass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly particleBuffer: ParticleBuffer;
    private readonly particleDefinitionBuffer: ParticleDefinitionBuffer;
    private readonly materialVisualBuffer: MaterialVisualBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;
    private cachedBindGroup: GPUBindGroup | null = null;

    private constructor(
        params: ParticleRenderPassCreateParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.particleBuffer = params.particleBuffer;
        this.particleDefinitionBuffer = params.particleDefinitionBuffer;
        this.materialVisualBuffer = params.materialVisualBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: 2 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the particle render shader and returns a ready-to-use pass. @internal */
    public static async Create(params: ParticleRenderPassCreateParams): Promise<ParticleRenderPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: params.device.createShaderModule({
                    code: ShaderAssembler.ParticleRender(workgroupSize),
                }),
                entryPoint: 'main',
            },
        });
        return new ParticleRenderPass(params, pipeline, workgroupSize);
    }

    /** Clears the particle texture then scatter-writes active particle pixels. @internal */
    public Run(params: ParticleRenderPassRunParams): void {
        const { encoder, layers, simOriginX, simOriginY } = params;
        this.device.queue.writeBuffer(this.uniforms, 0, new Float32Array([simOriginX, simOriginY]));

        const clearPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: layers.particleTexture.createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });
        clearPass.end();

        if (!this.cachedBindGroup) {
            this.cachedBindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.particleBuffer.buffer } },
                    { binding: 1, resource: { buffer: this.particleDefinitionBuffer.buffer } },
                    { binding: 2, resource: { buffer: this.materialVisualBuffer.buffer } },
                    { binding: 3, resource: layers.particleTexture.createView() },
                    { binding: 4, resource: { buffer: this.uniforms } },
                ],
            });
        }
        const bindGroup = this.cachedBindGroup;

        const { maxParticles } = ParticleConfig.GetConfig().performance;
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(maxParticles / (this.workgroupSize * this.workgroupSize)));
        pass.end();
    }

    // @omitfromdocs
    public Destroy(): void {
        this.uniforms.destroy();
        this.cachedBindGroup = null;
    }
}
