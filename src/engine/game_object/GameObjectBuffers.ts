import type { SimulationResource } from '../simulation/SimulationManager';

import { GameObjectCellSchema } from './GameObjectCellSchema';
import { GameObjectColliderSchema } from './GameObjectColliderSchema';
import { GameObjectConfig } from '../config/GameObjectConfig';
import { GameObjectStateSchema } from './GameObjectStateSchema';

/**
 * Persistent GPU buffers for game object simulation.
 *
 * {@link stateBuffer} holds live physics state for every active game object and is
 * read-written by the {@link GameObjectPhysicsPass} each frame. {@link cellBuffer} holds all
 * cell data packed flat across all game objects and is updated only on spawn or cell loss.
 *
 * Two separate uniform buffers are used for erase and stamp passes so that both
 * {@link device.queue.writeBuffer} calls can be issued before the encoder is
 * submitted without either overwriting the other's mode field.
 *
 * Created and owned by {@link GameObjectPass}.
 */
export class GameObjectBuffers implements SimulationResource {
    public readonly stateBuffer: GPUBuffer;
    public readonly stateReadbackBuffer: GPUBuffer;
    public readonly cellBuffer: GPUBuffer;
    public readonly physicsUniformBuffer: GPUBuffer;
    public readonly eraseUniformBuffer: GPUBuffer;
    public readonly stampUniformBuffer: GPUBuffer;
    public readonly colliderBuffer: GPUBuffer;
    public readonly collisionUniformBuffer: GPUBuffer;
    public readonly deadCellBuffer: GPUBuffer;
    public readonly deadCellReadbackBuffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const { maxGameObjectCount, maxGameObjectCellsCount } = GameObjectConfig.GetConfig().performance;

        const stateBufferSize = maxGameObjectCount * GameObjectStateSchema.byteStride;
        this.stateBuffer = device.createBuffer({
            size: stateBufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        this.stateReadbackBuffer = device.createBuffer({
            size: stateBufferSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        this.cellBuffer = device.createBuffer({
            size: maxGameObjectCellsCount * GameObjectCellSchema.byteStride,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.physicsUniformBuffer = device.createBuffer({
            size: 5 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.eraseUniformBuffer = device.createBuffer({
            size: 8 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.stampUniformBuffer = device.createBuffer({
            size: 8 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.colliderBuffer = device.createBuffer({
            size: maxGameObjectCellsCount * GameObjectColliderSchema.byteStride,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        this.collisionUniformBuffer = device.createBuffer({
            size: 18 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.deadCellBuffer = device.createBuffer({
            size: maxGameObjectCellsCount * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        this.deadCellReadbackBuffer = device.createBuffer({
            size: maxGameObjectCellsCount * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    // @omitfromdocs
    public Destroy(): void {
        this.stateBuffer.destroy();
        this.stateReadbackBuffer.destroy();
        this.cellBuffer.destroy();
        this.physicsUniformBuffer.destroy();
        this.eraseUniformBuffer.destroy();
        this.stampUniformBuffer.destroy();
        this.colliderBuffer.destroy();
        this.collisionUniformBuffer.destroy();
        this.deadCellBuffer.destroy();
        this.deadCellReadbackBuffer.destroy();
    }
}
