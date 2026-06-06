import type { GameObjectLayer } from '../game_object/GameObjectLayer';
import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { SimulationLayer } from './SimulationLayer';
import type { SimulationResource } from './SimulationManager';

import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface PhysicsPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
    physicsBuffer: MaterialPhysicsBuffer;
    goStateBuffer: GPUBuffer;
}

/**
 * GPU compute pass that runs temperature, pressure, and velocity propagation.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class PhysicsPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly gameObjectLayer: GameObjectLayer;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly goStateBuffer: GPUBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: PhysicsPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.gameObjectLayer = params.gameObjectLayer;
        this.physicsBuffer = params.physicsBuffer;
        this.goStateBuffer = params.goStateBuffer;
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

        const layout = this.pipeline.getBindGroupLayout(0);
        const simBindGroup = this.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: this.simulationLayer.currentPhysics.createView() },
                { binding: 2, resource: this.simulationLayer.nextPhysics.createView() },
                { binding: 3, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 4, resource: { buffer: this.uniforms } },
                { binding: 5, resource: this.gameObjectLayer.currentIdentity.createView() },
                { binding: 6, resource: this.gameObjectLayer.currentPhysics.createView() },
                { binding: 7, resource: this.gameObjectLayer.currentOwnership.createView() },
                { binding: 8, resource: { buffer: this.goStateBuffer } },
            ],
        });
        const goBindGroup = this.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: this.gameObjectLayer.currentIdentity.createView() },
                { binding: 1, resource: this.gameObjectLayer.currentPhysics.createView() },
                { binding: 2, resource: this.gameObjectLayer.nextPhysics.createView() },
                { binding: 3, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 4, resource: { buffer: this.uniforms } },
                { binding: 5, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 6, resource: this.simulationLayer.currentPhysics.createView() },
                { binding: 7, resource: this.gameObjectLayer.currentOwnership.createView() },
                { binding: 8, resource: { buffer: this.goStateBuffer } },
            ],
        });

        const workgroupsX = Math.ceil(this.simulationLayer.width / this.workgroupSize);
        const workgroupsY = Math.ceil(this.simulationLayer.height / this.workgroupSize);

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, simBindGroup);
        pass.dispatchWorkgroups(workgroupsX, workgroupsY);
        pass.setBindGroup(0, goBindGroup);
        pass.dispatchWorkgroups(workgroupsX, workgroupsY);
        pass.end();
    }

    // @omitfromdocs
    public Destroy(): void {
        this.uniforms.destroy();
    }
}
