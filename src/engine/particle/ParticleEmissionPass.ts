import type { ParticleBuffer } from './ParticleBuffer';
import type { ParticleDefinitionBuffer } from './ParticleDefinitionBuffer';
import type { ParticleEmitterBuffer } from './ParticleEmitterBuffer';
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
    particleEmitterBuffer: ParticleEmitterBuffer;
}

interface ParticleEmissionRunParams {
    encoder: GPUCommandEncoder;
    time: number;
    deltaTime: number;
    simOriginX: number;
    simOriginY: number;
}

/**
 * GPU compute pass that emits new particles into {@link ParticleBuffer} each frame.
 *
 * Runs two dispatches back-to-back:
 * 1. Material emission — one thread per sim cell, fires when the cell's material has a registered
 *    source in {@link ParticleSourceLookupBuffer}.
 * 2. GameObject emission — one thread per slot in {@link ParticleEmitterBuffer}, fires for active emitters
 *    placed at world positions by game objects.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class ParticleEmissionPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly materialPipeline: GPUComputePipeline;
    private readonly gameObjectPipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly particleBuffer: ParticleBuffer;
    private readonly particleSourceLookupBuffer: ParticleSourceLookupBuffer;
    private readonly particleDefinitionBuffer: ParticleDefinitionBuffer;
    private readonly particleEmitterBuffer: ParticleEmitterBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: ParticleEmissionPassParams,
        materialPipeline: GPUComputePipeline,
        gameObjectPipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.materialPipeline = materialPipeline;
        this.gameObjectPipeline = gameObjectPipeline;
        this.simulationLayer = params.simulationLayer;
        this.particleBuffer = params.particleBuffer;
        this.particleSourceLookupBuffer = params.particleSourceLookupBuffer;
        this.particleDefinitionBuffer = params.particleDefinitionBuffer;
        this.particleEmitterBuffer = params.particleEmitterBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles both particle emission compute shaders and returns a ready-to-use pass. @internal */
    static async Create(params: ParticleEmissionPassParams): Promise<ParticleEmissionPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const [materialPipeline, gameObjectPipeline] = await Promise.all([
            params.device.createComputePipelineAsync({
                layout: 'auto',
                compute: {
                    module: params.device.createShaderModule({
                        code: ShaderAssembler.ParticleMaterialEmission(workgroupSize),
                    }),
                    entryPoint: 'main',
                },
            }),
            params.device.createComputePipelineAsync({
                layout: 'auto',
                compute: {
                    module: params.device.createShaderModule({
                        code: ShaderAssembler.ParticleGameObjectEmission(workgroupSize),
                    }),
                    entryPoint: 'main',
                },
            }),
        ]);
        return new ParticleEmissionPass(params, materialPipeline, gameObjectPipeline, workgroupSize);
    }

    /** Encodes material and GameObject particle emission dispatches into the provided command encoder. @internal */
    public Run(params: ParticleEmissionRunParams): void {
        const { encoder, time, deltaTime, simOriginX, simOriginY } = params;
        this.device.queue.writeBuffer(this.uniforms, 0, new Float32Array([time, deltaTime, simOriginX, simOriginY]));

        const materialBindGroup = this.device.createBindGroup({
            layout: this.materialPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: { buffer: this.particleSourceLookupBuffer.buffer } },
                { binding: 2, resource: { buffer: this.particleDefinitionBuffer.buffer } },
                { binding: 3, resource: { buffer: this.particleBuffer.buffer } },
                { binding: 4, resource: { buffer: this.uniforms } },
                { binding: 5, resource: this.simulationLayer.currentPhysics.createView() },
            ],
        });

        const gameObjectBindGroup = this.device.createBindGroup({
            layout: this.gameObjectPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.particleEmitterBuffer.buffer } },
                { binding: 1, resource: { buffer: this.particleDefinitionBuffer.buffer } },
                { binding: 2, resource: { buffer: this.particleBuffer.buffer } },
                { binding: 3, resource: { buffer: this.uniforms } },
                { binding: 4, resource: this.simulationLayer.currentPhysics.createView() },
            ],
        });

        const gameObjectWorkgroups = Math.ceil(
            this.particleEmitterBuffer.capacity / (this.workgroupSize * this.workgroupSize)
        );

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.materialPipeline);
        pass.setBindGroup(0, materialBindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(this.simulationLayer.width / this.workgroupSize),
            Math.ceil(this.simulationLayer.height / this.workgroupSize)
        );
        pass.setPipeline(this.gameObjectPipeline);
        pass.setBindGroup(0, gameObjectBindGroup);
        pass.dispatchWorkgroups(gameObjectWorkgroups);
        pass.end();
    }

    // @omitfromdocs
    public Destroy(): void {
        this.uniforms.destroy();
    }
}
