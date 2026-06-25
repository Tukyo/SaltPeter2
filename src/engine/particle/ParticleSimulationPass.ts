import type { ParticleBuffer } from './ParticleBuffer';
import type { ParticleDefinitionBuffer } from './ParticleDefinitionBuffer';
import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { SimulationResource } from '../simulation/SimulationManager';

import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';
import { ParticleConfig } from '../config/ParticleConfig';

interface ParticleSimulationPassParams {
    device: GPUDevice;
    particleBuffer: ParticleBuffer;
    particleDefinitionBuffer: ParticleDefinitionBuffer;
    simulationLayer: SimulationLayer;
}

/**
 * GPU compute pass that ticks every live particle in {@link ParticleBuffer} each frame.
 *
 * Each thread covers one particle slot. Updates position from velocity, decrements
 * lifetime, and marks the slot inactive when lifetime expires.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class ParticleSimulationPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly particleBuffer: ParticleBuffer;
    private readonly particleDefinitionBuffer: ParticleDefinitionBuffer;
    private readonly simulationLayer: SimulationLayer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;
    private readonly bindGroupCache = new Map<GPUTexture, GPUBindGroup>();

    private constructor(
        params: ParticleSimulationPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.particleBuffer = params.particleBuffer;
        this.particleDefinitionBuffer = params.particleDefinitionBuffer;
        this.simulationLayer = params.simulationLayer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the particle simulation compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: ParticleSimulationPassParams): Promise<ParticleSimulationPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.ParticleSimulation(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new ParticleSimulationPass(params, pipeline, workgroupSize);
    }

    /** Encodes a particle simulation dispatch into the provided command encoder. @internal */
    public Run(encoder: GPUCommandEncoder, deltaTime: number, time: number, simOriginX: number, simOriginY: number): void {
        this.device.queue.writeBuffer(this.uniforms, 0, new Float32Array([deltaTime, time, simOriginX, simOriginY]));

        const cacheKey = this.simulationLayer.currentIdentity;
        let bindGroup = this.bindGroupCache.get(cacheKey);
        if (!bindGroup) {
            bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.particleBuffer.buffer } },
                    { binding: 1, resource: { buffer: this.particleDefinitionBuffer.buffer } },
                    { binding: 2, resource: { buffer: this.uniforms } },
                    { binding: 3, resource: this.simulationLayer.currentIdentity.createView() },
                    { binding: 4, resource: this.simulationLayer.currentPhysics.createView() },
                ],
            });
            this.bindGroupCache.set(cacheKey, bindGroup);
        }

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
        this.bindGroupCache.clear();
    }

}
