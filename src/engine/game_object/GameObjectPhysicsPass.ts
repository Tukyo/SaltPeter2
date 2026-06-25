import type { GameObjectBuffers } from './GameObjectBuffers';

import { GameObjectConfig } from '../config/GameObjectConfig';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface GameObjectPhysicsPassParams {
    device: GPUDevice;
    buffers: GameObjectBuffers;
}

interface GameObjectPhysicsRunParams {
    encoder: GPUCommandEncoder;
    gravity: number;
    simStepDuration: number;
}

/**
 * GPU compute pass that integrates Rigidbody velocity and updates game object
 * positions directly in the persistent {@link GameObjectBuffers.stateBuffer} each simulation step.
 *
 * Runs between the erase and stamp passes:
 *   erase reads old positions → physics updates positions → stamp reads new positions.
 * No CPU involvement in the hot path after initial state upload.
 *
 * Created and owned by {@link GameObjectPass}. Do not call directly.
 */
export class GameObjectPhysicsPass {
    private readonly device: GPUDevice;
    private readonly buffers: GameObjectBuffers;
    private readonly pipeline: GPUComputePipeline;
    private readonly workgroupSize: number;
    private cachedBindGroup: GPUBindGroup | null = null;

    private constructor(
        params: GameObjectPhysicsPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.buffers = params.buffers;
        this.pipeline = pipeline;
        this.workgroupSize = workgroupSize;
    }

    // @omitfromdocs
    public static async Create(params: GameObjectPhysicsPassParams): Promise<GameObjectPhysicsPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.GameObjectPhysics(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new GameObjectPhysicsPass(params, pipeline, workgroupSize);
    }

    /** Integrates velocity for all Dynamic game objects this simulation step. @internal */
    public Run(params: GameObjectPhysicsRunParams): void {
        const { encoder, gravity, simStepDuration } = params;
        const { device, buffers } = this;
        const maxGameObjectCount = GameObjectConfig.GetConfig().performance.maxGameObjectCount;

        const uniformData = new ArrayBuffer(20);
        const uf = new Float32Array(uniformData);
        const uu = new Uint32Array(uniformData);
        uf[0] = gravity;
        uf[1] = simStepDuration;
        uu[2] = maxGameObjectCount;
        uf[3] = GameObjectConfig.GetConfig().performance.maxSpeed;
        uf[4] = GameObjectConfig.GetConfig().physics.angular.maxAngularSpeed;

        device.queue.writeBuffer(buffers.physicsUniformBuffer, 0, uniformData);

        if (!this.cachedBindGroup) {
            this.cachedBindGroup = device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: buffers.stateBuffer } },
                    { binding: 1, resource: { buffer: buffers.physicsUniformBuffer } },
                ],
            });
        }
        const bindGroup = this.cachedBindGroup;

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(maxGameObjectCount / this.workgroupSize));
        pass.end();
    }
}
