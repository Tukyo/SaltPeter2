import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { PingPongTargets } from './PingPongTargets';

import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface PhysicsPassParams {
    device: GPUDevice;
    targets: PingPongTargets;
    physicsBuffer: MaterialPhysicsBuffer;
}

/**
 * GPU compute pass that runs temperature, pressure, and velocity propagation.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class PhysicsPass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly targets: PingPongTargets;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: PhysicsPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.targets = params.targets;
        this.physicsBuffer = params.physicsBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the physics compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: PhysicsPassParams): Promise<PhysicsPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.Physics(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new PhysicsPass(params, pipeline, workgroupSize);
    }

    /** Encodes a physics compute dispatch into the provided command encoder. @internal */
    public Run(encoder: GPUCommandEncoder, gravity: number): void {
        this.device.queue.writeBuffer(this.uniforms, 0, new Float32Array([gravity]));

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.targets.currentIdentity.createView() },
                { binding: 1, resource: this.targets.currentPhysics.createView() },
                { binding: 2, resource: this.targets.nextPhysics.createView() },
                { binding: 3, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 4, resource: { buffer: this.uniforms } },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(this.targets.width / this.workgroupSize),
            Math.ceil(this.targets.height / this.workgroupSize)
        );
        pass.end();
    }

    public OnDestroy(): void {
        this.uniforms.destroy();
    }
}
