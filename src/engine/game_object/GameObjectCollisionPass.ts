import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { SimulationLayer } from '../simulation/SimulationLayer';
import type { GameObjectLayer } from './GameObjectLayer';

import { GameObjectBuffers } from './GameObjectBuffers';
import { GameObjectConfig } from '../config/GameObjectConfig';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface GameObjectCollisionPassCreateParams {
    device: GPUDevice;
    buffers: GameObjectBuffers;
    physicsBuffer: MaterialPhysicsBuffer;
}

interface GameObjectCollisionPassRunParams {
    encoder: GPUCommandEncoder;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
    gravity: number;
    simStepDuration: number;
}

/**
 * Detects collisions between game object boundary cells and occupied sim cells.
 *
 * One GPU thread per game object slot. Each thread walks the game object's
 * pre-built boundary points (stored in {@link GameObjectBuffers.colliderBuffer}),
 * samples the identity texture at each world position, and accumulates a
 * collision normal from any occupied cells or out-of-bounds hits. The summed
 * normal is used to reflect the game object's velocity away from the surface;
 * the updated state is written back to {@link GameObjectBuffers.stateBuffer}.
 *
 * Must run AFTER the physics pass and BEFORE the stamp pass. At that point
 * the identity texture contains only sim cells — game object cells were erased
 * at the start of the frame, so no self-collision filtering is needed.
 *
 * Created and owned by {@link GameObjectPass}. Do not call directly.
 */
export class GameObjectCollisionPass {
    private readonly device: GPUDevice;
    private readonly buffers: GameObjectBuffers;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly pipeline: GPUComputePipeline;
    private readonly workgroupSize: number;

    private constructor(
        params: GameObjectCollisionPassCreateParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.buffers = params.buffers;
        this.physicsBuffer = params.physicsBuffer;
        this.pipeline = pipeline;
        this.workgroupSize = workgroupSize;
    }

    /** Compiles the collision shader and returns a ready-to-use pass. @internal */
    public static async Create(
        params: GameObjectCollisionPassCreateParams
    ): Promise<GameObjectCollisionPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;

        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: params.device.createShaderModule({
                    code: ShaderAssembler.GameObjectCollision(workgroupSize),
                }),
                entryPoint: 'main',
            },
        });

        return new GameObjectCollisionPass(params, pipeline, workgroupSize);
    }

    /** Dispatches the collision detection and velocity reflection pass. @internal */
    public Run(params: GameObjectCollisionPassRunParams): void {
        const { encoder, simulationLayer, gameObjectLayer, gravity, simStepDuration } = params;
        const { device, buffers, pipeline, workgroupSize } = this;
        const maxGameObjectCount = GameObjectConfig.GetConfig().performance.maxGameObjectCount;

        // Mixed u32/f32 fields — use a shared ArrayBuffer with typed views
        const physics = GameObjectConfig.GetConfig().physics;
        const uniformData = new ArrayBuffer(15 * 4);
        const uu = new Uint32Array(uniformData);
        const uf = new Float32Array(uniformData);
        uu[0] = gameObjectLayer.width;
        uu[1] = gameObjectLayer.height;
        uu[2] = maxGameObjectCount;
        uu[3] = physics.sleep.linear.delay;
        uf[4] = gravity;
        uf[5] = simStepDuration;
        uf[6] = physics.collision.depenetration.force;
        uf[7] = physics.collision.depenetration.hardness;
        uf[8] = physics.collision.detection.threshold;
        uf[9] = physics.collision.settle.threshold;
        uf[10] = physics.sleep.linear.threshold;
        uf[11] = physics.sleep.wake.contactFraction;
        uf[12] = physics.sleep.angular.threshold;
        uf[13] = physics.liquid.buoyancy;
        uf[14] = physics.liquid.drag;
        device.queue.writeBuffer(buffers.collisionUniformBuffer, 0, uniformData);

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: buffers.stateBuffer } },
                { binding: 1, resource: { buffer: buffers.colliderBuffer } },
                { binding: 2, resource: { buffer: buffers.collisionUniformBuffer } },
                { binding: 3, resource: simulationLayer.nextIdentity.createView() },
                { binding: 4, resource: gameObjectLayer.currentOwnership.createView() },
                { binding: 5, resource: { buffer: this.physicsBuffer.buffer } },
            ],
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(maxGameObjectCount / workgroupSize));
        pass.end();
    }
}
