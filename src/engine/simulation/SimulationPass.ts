import type { GameObjectLayer } from '../game_object/GameObjectLayer';
import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { MaterialSimulationBuffer } from '../materials/MaterialSimulationBuffer';
import type { MaterialStateBuffer } from '../materials/MaterialStateBuffer';
import type { ReactionLookupBuffer } from '../materials/ReactionLookupBuffer';
import type { SimulationLayer } from './SimulationLayer';
import type { SimulationResource } from './SimulationManager';
import type { SimulationTexture } from './SimulationTexture';

import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';
import { SimulationSchema } from './SimulationSchema';

interface SimulationPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    gameObjectLayer: GameObjectLayer;
    intent: SimulationTexture;
    physicsBuffer: MaterialPhysicsBuffer;
    simBuffer: MaterialSimulationBuffer;
    stateBuffer: MaterialStateBuffer;
    reactionBuffer: ReactionLookupBuffer;
}

interface SimulationRunParams {
    encoder: GPUCommandEncoder;
    time: number;
    gravity: number;
}

/**
 * GPU compute pass that resolves per-cell movement and applies reactions for the current frame.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class SimulationPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly gameObjectLayer: GameObjectLayer;
    private readonly intent: SimulationTexture;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly simBuffer: MaterialSimulationBuffer;
    private readonly stateBuffer: MaterialStateBuffer;
    private readonly reactionBuffer: ReactionLookupBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: SimulationPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.gameObjectLayer = params.gameObjectLayer;
        this.intent = params.intent;
        this.physicsBuffer = params.physicsBuffer;
        this.simBuffer = params.simBuffer;
        this.stateBuffer = params.stateBuffer;
        this.reactionBuffer = params.reactionBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: SimulationSchema.GetSimUniformFields().length * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the simulation compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: SimulationPassParams): Promise<SimulationPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.Simulation(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new SimulationPass(params, pipeline, workgroupSize);
    }

    /** Encodes a simulation compute dispatch into the provided command encoder. @internal */
    public Run(params: SimulationRunParams): void {
        const { device } = this;
        const { encoder, time, gravity } = params;

        const gravityStrength = Math.max(1, Math.abs(gravity));
        const deltaTime = 1 / (SimulationConfig.GetConfig().time.baseTickRate * gravityStrength);
        device.queue.writeBuffer(this.uniforms, 0, new Float32Array([time, gravity, deltaTime]));

        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: this.simulationLayer.nextIdentity.createView() },
                { binding: 2, resource: this.intent.texture.createView() },
                { binding: 3, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 4, resource: { buffer: this.simBuffer.buffer } },
                { binding: 5, resource: { buffer: this.uniforms } },
                { binding: 6, resource: this.simulationLayer.currentPhysics.createView() },
                { binding: 7, resource: this.simulationLayer.nextPhysics.createView() },
                { binding: 8, resource: this.simulationLayer.currentState.createView() },
                { binding: 9, resource: this.simulationLayer.nextState.createView() },
                { binding: 10, resource: { buffer: this.stateBuffer.buffer } },
                { binding: 11, resource: { buffer: this.reactionBuffer.buffer } },
                { binding: 12, resource: this.gameObjectLayer.currentOwnership.createView() },
                { binding: 13, resource: this.gameObjectLayer.currentIdentity.createView() },
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
