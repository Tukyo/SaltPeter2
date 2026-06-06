import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { MaterialSimulationBuffer } from '../materials/MaterialSimulationBuffer';
import type { ReactionLookupBuffer } from '../materials/ReactionLookupBuffer';
import type { SimulationLayer } from './SimulationLayer';
import type { SimulationResource } from './SimulationManager';
import type { SimulationTexture } from './SimulationTexture';

import { PhysicsConfig } from '../config/PhysicsConfig';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';
import { SimulationSchema } from './SimulationSchema';

interface IntentPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    intent: SimulationTexture;
    physicsBuffer: MaterialPhysicsBuffer;
    simBuffer: MaterialSimulationBuffer;
    reactionBuffer: ReactionLookupBuffer;
}

interface IntentRunParams {
    encoder: GPUCommandEncoder;
    time: number;
    gravity: number;
}

/**
 * GPU compute pass that determines per-cell movement intent for the current frame.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class IntentPass implements SimulationResource {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly intent: SimulationTexture;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly simBuffer: MaterialSimulationBuffer;
    private readonly reactionBuffer: ReactionLookupBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: IntentPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.intent = params.intent;
        this.physicsBuffer = params.physicsBuffer;
        this.simBuffer = params.simBuffer;
        this.reactionBuffer = params.reactionBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: SimulationSchema.GetIntentUniformFields().length * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the intent compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: IntentPassParams): Promise<IntentPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.Intent(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new IntentPass(params, pipeline, workgroupSize);
    }

    /** Encodes an intent compute dispatch into the provided command encoder. @internal */
    public Run(params: IntentRunParams): void {
        const { device } = this;
        const { encoder, time, gravity } = params;

        const gravityStrength = Math.max(1, Math.abs(gravity));
        const deltaTime = 1 / (SimulationConfig.GetConfig().time.baseTickRate * gravityStrength);
        const spread = PhysicsConfig.GetConfig().pressure.spread;
        device.queue.writeBuffer(this.uniforms, 0, new Float32Array([
            time,
            gravity,
            deltaTime,
            spread.threshold.powder,
            spread.scale.powder,
            spread.maxChance.powder,
            spread.threshold.solid,
            spread.scale.solid,
            spread.maxChance.solid,
        ]));

        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: this.intent.texture.createView() },
                { binding: 2, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 3, resource: { buffer: this.simBuffer.buffer } },
                { binding: 4, resource: { buffer: this.uniforms } },
                { binding: 5, resource: this.simulationLayer.currentPhysics.createView() },
                { binding: 6, resource: { buffer: this.reactionBuffer.buffer } },
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
