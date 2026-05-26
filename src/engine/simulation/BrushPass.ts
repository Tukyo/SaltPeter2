import type { PingPongTargets } from './PingPongTargets';
import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { MaterialStateBuffer } from '../materials/MaterialStateBuffer';

import { BrushSchema } from '../brush/BrushSchema';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface BrushPassParams {
    device: GPUDevice;
    targets: PingPongTargets;
    physicsBuffer: MaterialPhysicsBuffer;
    stateBuffer: MaterialStateBuffer;
}

interface BrushParams {
    encoder: GPUCommandEncoder,
    mouseX: number,
    mouseY: number,
    materialId: number,
    radius: number,
    density: number,
    time: number,
    snap: boolean,
    shape: number,
    colorVariant: number,
    brushType: number,
    variantId?: number,
    occupancy?: number,
}

/**
 * GPU compute pass that writes brush strokes into the simulation texture.
 *
 * Created and owned by {@link SimulationManager}. Each frame, {@link BrushManager} calls
 * `Run()` via the manager — not directly.
 */
export class BrushPass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly targets: PingPongTargets;
    private readonly physicsBuffer: MaterialPhysicsBuffer;
    private readonly stateBuffer: MaterialStateBuffer;
    private readonly uniforms: GPUBuffer;
    private readonly workgroupSize: number;
    private readonly uniformSize: number;

    private constructor(
        params: BrushPassParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.pipeline = pipeline;
        this.targets = params.targets;
        this.physicsBuffer = params.physicsBuffer;
        this.stateBuffer = params.stateBuffer;
        this.workgroupSize = workgroupSize;
        this.uniformSize = BrushSchema.GetBrushUniformFields().length * 4;
        this.uniforms = this.device.createBuffer({
            size: this.uniformSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the brush compute shader and returns a ready-to-use pass. @internal */
    static async Create(params: BrushPassParams): Promise<BrushPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const shaderModule = params.device.createShaderModule({
            code: ShaderAssembler.Brush(workgroupSize),
        });
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' },
        });
        return new BrushPass(params, pipeline, workgroupSize);
    }

    /** Encodes a brush stroke compute dispatch into the provided command encoder. @internal */
    public Run(params: BrushParams): void {
        const { device } = this;
        const {
            encoder,
            mouseX,
            mouseY,
            materialId,
            radius,
            density,
            time,
            snap,
            shape,
            colorVariant,
            brushType,
            variantId = 0,
            occupancy = 1,
        } = params;

        const x = snap ? Math.floor(mouseX) + 0.5 : mouseX;
        const y = snap ? Math.floor(mouseY) + 0.5 : mouseY;

        device.queue.writeBuffer(this.uniforms, 0, new Float32Array([
            x,
            y,
            radius,
            density,
            materialId,
            time,
            shape,
            colorVariant,
            brushType,
            variantId,
            occupancy,
        ]));

        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.targets.currentIdentity.createView() },
                { binding: 1, resource: this.targets.nextIdentity.createView() },
                { binding: 2, resource: { buffer: this.uniforms } },
                { binding: 3, resource: this.targets.currentPhysics.createView() },
                { binding: 4, resource: this.targets.nextPhysics.createView() },
                { binding: 5, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 6, resource: this.targets.currentState.createView() },
                { binding: 7, resource: this.targets.nextState.createView() },
                { binding: 8, resource: { buffer: this.stateBuffer.buffer } },
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
