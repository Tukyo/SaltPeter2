import type { ParticleBuffer } from './ParticleBuffer';
import type { ParticleDefinitionBuffer } from './ParticleDefinitionBuffer';
import type { ParticleSourceLookupBuffer } from './ParticleSourceLookupBuffer';
import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { SimulationResource } from '../simulation/SimulationManager';

import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface ParticleEmissionPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    particleBuffer: ParticleBuffer;
    particleSourceLookupBuffer: ParticleSourceLookupBuffer;
    particleDefinitionBuffer: ParticleDefinitionBuffer;
}

interface ParticleEmissionRunParams {
    encoder: GPUCommandEncoder;
    time: number;
    deltaTime: number;
}

/**
 * GPU compute pass that reads the sim identity texture and emits new particles into {@link ParticleBuffer}.
 *
 * Each thread covers one sim cell. If that cell's material has a registered source in
 * {@link ParticleSourceLookupBuffer}, the pass probabilistically spawns particles into the
 * particle buffer according to the matching {@link ParticleDefinitionBuffer} emission rate.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class ParticleEmissionPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly particleBuffer: ParticleBuffer;
    private readonly particleSourceLookupBuffer: ParticleSourceLookupBuffer;
    private readonly particleDefinitionBuffer: ParticleDefinitionBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: ParticleEmissionPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.particleBuffer = params.particleBuffer;
        this.particleSourceLookupBuffer = params.particleSourceLookupBuffer;
        this.particleDefinitionBuffer = params.particleDefinitionBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: 2 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the particle emission compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: ParticleEmissionPassParams): Promise<ParticleEmissionPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.ParticleEmission(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new ParticleEmissionPass(params, pipeline, workgroupSize);
    }

    /** Encodes a particle emission dispatch into the provided command encoder. @internal */
    public Run(params: ParticleEmissionRunParams): void {
        const { encoder, time, deltaTime } = params;
        this.device.queue.writeBuffer(this.uniforms, 0, new Float32Array([time, deltaTime]));

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: { buffer: this.particleSourceLookupBuffer.buffer } },
                { binding: 2, resource: { buffer: this.particleDefinitionBuffer.buffer } },
                { binding: 3, resource: { buffer: this.particleBuffer.buffer } },
                { binding: 4, resource: { buffer: this.uniforms } },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(this.simulationLayer.width / this.workgroupSize),
            Math.ceil(this.simulationLayer.height / this.workgroupSize)
        );
        pass.end();
    }

    // @omitfromdocs
    public Destroy(): void {
        this.uniforms.destroy();
    }
}
