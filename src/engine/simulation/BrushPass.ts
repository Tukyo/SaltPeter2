import type { SimulationLayer } from './SimulationLayer';
import type { MaterialPhysicsBuffer } from '../materials/MaterialPhysicsBuffer';
import type { MaterialStateBuffer } from '../materials/MaterialStateBuffer';

import { BrushSchema } from '../brush/BrushSchema';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationConfig } from '../config/SimulationConfig';

interface BrushPassParams {
    device: GPUDevice;
    simulationLayer: SimulationLayer;
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
    paintMode?: number,
    marginSize?: number,
    colorWeight0?: number,
    colorWeight1?: number,
    colorWeight2?: number,
    colorWeight3?: number,
    stripeAngle?: number,
    stripeWidth?: number,
    overlayFilter?: number,
}

/**
 * GPU compute pass that writes brush strokes into the simulation texture.
 *
 * Created and owned by {@link BrushManager}. Each frame, calls
 * `Run()` via the manager — not directly.
 */
export class BrushPass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPUComputePipeline;
    private readonly simulationLayer: SimulationLayer;
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
        this.simulationLayer = params.simulationLayer;
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
            paintMode = 0,
            marginSize = 0,
            colorWeight0 = 0.82,
            colorWeight1 = 0.06,
            colorWeight2 = 0.06,
            colorWeight3 = 0.06,
            stripeAngle = Math.PI / 4,
            stripeWidth = 4,
            overlayFilter = 0,
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
            paintMode,
            marginSize,
            colorWeight0,
            colorWeight1,
            colorWeight2,
            colorWeight3,
            stripeAngle,
            stripeWidth,
            overlayFilter,
        ]));

        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.simulationLayer.currentIdentity.createView() },
                { binding: 1, resource: this.simulationLayer.nextIdentity.createView() },
                { binding: 2, resource: { buffer: this.uniforms } },
                { binding: 3, resource: this.simulationLayer.currentPhysics.createView() },
                { binding: 4, resource: this.simulationLayer.nextPhysics.createView() },
                { binding: 5, resource: { buffer: this.physicsBuffer.buffer } },
                { binding: 6, resource: this.simulationLayer.currentState.createView() },
                { binding: 7, resource: this.simulationLayer.nextState.createView() },
                { binding: 8, resource: { buffer: this.stateBuffer.buffer } },
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
