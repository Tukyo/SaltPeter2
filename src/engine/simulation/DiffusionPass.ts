import type { SimulationLayer } from './SimulationLayer';
import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';

import { PhysicsConfig } from '../config/PhysicsConfig';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';
import { SimulationSchema } from './SimulationSchema';

interface DiffusionPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
    physicsBuffer: MaterialPhysicsBuffer;
}

/**
 * GPU compute pass that runs pressure diffusion across the simulation texture.
 *
 * Created and owned by {@link SimulationManager}. Called each frame by the manager — not directly.
 */
export class DiffusionPass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;

    private constructor(
        params: DiffusionPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.simulationLayer = params.simulationLayer;
        this.physicsBuffer = params.physicsBuffer;
        this.workgroupSize = workgroupSize;
        this.uniforms = this.device.createBuffer({
            size: SimulationSchema.GetDiffusionUniformFields().length * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the diffusion compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: DiffusionPassParams): Promise<DiffusionPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.Diffusion(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new DiffusionPass(params, pipeline, workgroupSize);
    }

    /** Encodes a diffusion compute dispatch into the provided command encoder. @internal */
    public Run(encoder: GPUCommandEncoder, parity: number): void {
        const pressure = PhysicsConfig.GetConfig().pressure;
        const uniformData = new ArrayBuffer(60);
        new Uint32Array(uniformData, 0, 1)[0] = parity;
        const f32 = new Float32Array(uniformData, 4, 14);
        f32[0] = pressure.swapThreshold.gas;
        f32[1] = pressure.swapThreshold.liquid;
        f32[2] = pressure.swapThreshold.powder;
        f32[3] = pressure.swapThreshold.solid;
        f32[4] = pressure.swapScale.gas;
        f32[5] = pressure.swapScale.liquid;
        f32[6] = pressure.swapScale.powder;
        f32[7] = pressure.swapScale.solid;
        f32[8] = pressure.resistance.gas;
        f32[9] = pressure.resistance.liquid;
        f32[10] = pressure.resistance.powder;
        f32[11] = pressure.resistance.solid;
        f32[12] = pressure.densityScale.liquid;
        f32[13] = pressure.densityScale.gas;
        this.device.queue.writeBuffer(this.uniforms, 0, uniformData);

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: this.simulationLayer.nextIdentity.createView() },
                { binding: 2, resource: this.simulationLayer.currentPhysics.createView() },
                { binding: 3, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 4, resource: this.simulationLayer.nextPhysics.createView() },
                { binding: 5, resource: { buffer: this.uniforms } },
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

    public OnDestroy(): void {
        this.uniforms.destroy();
    }
}
