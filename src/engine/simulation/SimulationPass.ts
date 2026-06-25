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
    simStepDuration: number;
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
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;
    private readonly initialPhysics: GPUTexture;
    private readonly initialState: GPUTexture;
    private readonly bindGroupA0: GPUBindGroup;
    private readonly bindGroupA1: GPUBindGroup;
    private readonly bindGroupB0: GPUBindGroup;
    private readonly bindGroupB1: GPUBindGroup;

    private constructor(
        params: SimulationPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: SimulationSchema.GetSimUniformFields().length * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.initialPhysics = params.simulationLayer.currentPhysics;
        this.initialState = params.simulationLayer.currentState;
        const layout = pipeline.getBindGroupLayout(0);
        const sim = params.simulationLayer;
        const go = params.gameObjectLayer;
        const stableEntries = [
            { binding: 2, resource: params.intent.texture.createView() },
            { binding: 3, resource: { buffer: params.physicsBuffer.buffer } },
            { binding: 4, resource: { buffer: params.simBuffer.buffer } },
            { binding: 5, resource: { buffer: this.uniforms } },
            { binding: 10, resource: { buffer: params.stateBuffer.buffer } },
            { binding: 11, resource: { buffer: params.reactionBuffer.buffer } },
        ];

        this.bindGroupA0 = this.device.createBindGroup({ layout, entries: [
            { binding: 0, resource: sim.currentIdentity.createView() },
            { binding: 1, resource: sim.nextIdentity.createView() },
            ...stableEntries,
            { binding: 6, resource: sim.currentPhysics.createView() },
            { binding: 7, resource: sim.nextPhysics.createView() },
            { binding: 8, resource: sim.currentState.createView() },
            { binding: 9, resource: sim.nextState.createView() },
            { binding: 12, resource: go.currentOwnership.createView() },
            { binding: 13, resource: go.currentIdentity.createView() },
        ]});

        this.bindGroupA1 = this.device.createBindGroup({ layout, entries: [
            { binding: 0, resource: sim.currentIdentity.createView() },
            { binding: 1, resource: sim.nextIdentity.createView() },
            ...stableEntries,
            { binding: 6, resource: sim.currentPhysics.createView() },
            { binding: 7, resource: sim.nextPhysics.createView() },
            { binding: 8, resource: sim.nextState.createView() },
            { binding: 9, resource: sim.currentState.createView() },
            { binding: 12, resource: go.nextOwnership.createView() },
            { binding: 13, resource: go.nextIdentity.createView() },
        ]});

        this.bindGroupB0 = this.device.createBindGroup({ layout, entries: [
            { binding: 0, resource: sim.currentIdentity.createView() },
            { binding: 1, resource: sim.nextIdentity.createView() },
            ...stableEntries,
            { binding: 6, resource: sim.nextPhysics.createView() },
            { binding: 7, resource: sim.currentPhysics.createView() },
            { binding: 8, resource: sim.currentState.createView() },
            { binding: 9, resource: sim.nextState.createView() },
            { binding: 12, resource: go.currentOwnership.createView() },
            { binding: 13, resource: go.currentIdentity.createView() },
        ]});

        this.bindGroupB1 = this.device.createBindGroup({ layout, entries: [
            { binding: 0, resource: sim.currentIdentity.createView() },
            { binding: 1, resource: sim.nextIdentity.createView() },
            ...stableEntries,
            { binding: 6, resource: sim.nextPhysics.createView() },
            { binding: 7, resource: sim.currentPhysics.createView() },
            { binding: 8, resource: sim.nextState.createView() },
            { binding: 9, resource: sim.currentState.createView() },
            { binding: 12, resource: go.nextOwnership.createView() },
            { binding: 13, resource: go.nextIdentity.createView() },
        ]});
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
        const { encoder, time, gravity, simStepDuration } = params;

        this.device.queue.writeBuffer(this.uniforms, 0, new Float32Array([time, gravity, simStepDuration]));

        const physicsIsInitial = this.simulationLayer.currentPhysics === this.initialPhysics;
        const stateIsInitial = this.simulationLayer.currentState === this.initialState;
        let bindGroup: GPUBindGroup;
        if (physicsIsInitial && stateIsInitial) { bindGroup = this.bindGroupA0; }
        else if (physicsIsInitial && !stateIsInitial) { bindGroup = this.bindGroupA1; }
        else if (!physicsIsInitial && stateIsInitial) { bindGroup = this.bindGroupB0; }
        else { bindGroup = this.bindGroupB1; }

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
