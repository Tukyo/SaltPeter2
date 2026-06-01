import type { Size2D } from '../../definitions/Primitives';
import type { RenderingLayers } from '../RenderingLayers';

import { Camera } from '../../camera/Camera';
import { ShaderAssembler } from '../../shaders/ShaderAssembler';
import { World } from '../../world/World';
import { WorldConfig } from '../../config/WorldConfig';

interface CompositePassCreateParams {
    device: GPUDevice;
    format: GPUTextureFormat;
}

interface CompositePassRunParams {
    encoder: GPUCommandEncoder;
    swapchainView: GPUTextureView;
    layers: RenderingLayers;
    canvasSize: Size2D;
}

/**
 * Final render pass of the forward rendering pipeline.
 *
 * Reads all populated {@link RenderingLayers} textures and composites them
 * bottom-to-top using Porter-Duff "over" blending, then outputs the result
 * to the swapchain texture. Layer order: GOs → Sim.
 *
 * Created and owned by {@link RenderingManager}. Do not call directly.
 */
export class CompositePass {
    private readonly device: GPUDevice;
    private readonly pipeline: GPURenderPipeline;
    private readonly cropBuffer: GPUBuffer;

    private constructor(device: GPUDevice, pipeline: GPURenderPipeline) {
        this.device = device;
        this.pipeline = pipeline;
        this.cropBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /** Compiles the composite shader and returns a ready-to-use pass. @internal */
    public static async Create(params: CompositePassCreateParams): Promise<CompositePass> {
        const { device, format } = params;
        const shaderModule = device.createShaderModule({ code: ShaderAssembler.Composite() });
        const pipeline = await device.createRenderPipelineAsync({
            layout: 'auto',
            vertex: { module: shaderModule, entryPoint: 'vs_main' },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                    },
                }],
            },
            primitive: { topology: 'triangle-list' },
        });
        return new CompositePass(device, pipeline);
    }

    /** Blends all layer textures and writes the result to the swapchain view. @internal */
    public Run(params: CompositePassRunParams): void {
        const { encoder, swapchainView, layers, canvasSize } = params;

        const crop = this.ComputeCrop(layers.size, canvasSize);
        this.device.queue.writeBuffer(this.cropBuffer, 0, crop);

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: layers.simTexture.createView() },
                { binding: 1, resource: layers.gameObjectsTexture.createView() },
                { binding: 2, resource: { buffer: this.cropBuffer } },
            ],
        });

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: swapchainView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
    }

    private ComputeCrop(simSize: Size2D, canvasSize: Size2D): Float32Array {
        const { chunk } = WorldConfig.GetConfig();
        const margin = chunk.margin * chunk.size;
        const contentW = simSize.width - 2 * margin;
        const contentH = simSize.height - 2 * margin;
        const world = World.Instance;
        const cam = Camera.Instance;

        if (world && cam) {
            const { x: camX, y: camY } = cam.GetCameraPos();
            return new Float32Array([
                (margin + camX * contentW / canvasSize.width) / simSize.width,
                (margin - camY * contentH / canvasSize.height) / simSize.height,
                contentW / simSize.width,
                contentH / simSize.height,
            ]);
        }

        if (world) {
            return new Float32Array([
                margin / simSize.width,
                margin / simSize.height,
                contentW / simSize.width,
                contentH / simSize.height,
            ]);
        }

        return new Float32Array([0, 0, 1, 1]);
    }

    // @omitfromdocs
    public Destroy(): void { this.cropBuffer.destroy(); }
}
