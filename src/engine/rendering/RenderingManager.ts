import type { MaterialVisualBuffer } from '../materials/MaterialVisualBuffer';
import type { PingPongTargets } from '../simulation/PingPongTargets';

import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from './Renderer';
import { ShaderAssembler } from '../shaders/ShaderAssembler';
import { SimulationManager } from '../simulation/SimulationManager';
import { Camera } from '../camera/Camera';
import { World } from '../world/World';
import { WorldConfig } from '../config/WorldConfig';

/**
 * Drives the main WebGPU display pass each frame.
 *
 * Waits for {@link SimulationManager} to initialize, then builds a render pipeline using the
 * display shader and binds the simulation's ping-pong texture, material visual buffer, and a
 * crop/camera uniform. Each `Update` recomputes the crop UV from the active {@link Camera} and
 * submits a fullscreen triangle pass to the WebGPU canvas.
 */
export class RenderingManager extends NitrateProcess {
    public static Instance: RenderingManager | null = null;

    private pipeline: GPURenderPipeline | null = null;
    private targets: PingPongTargets | null = null;
    private materialVisualBuffer: MaterialVisualBuffer | null = null;
    private cropBuffer: GPUBuffer | null = null;

    private readonly onSimInit: () => Promise<void>;

    constructor() {
        super();
        RenderingManager.Instance = this;
        this.onSimInit = async () => {
            if (RenderingManager.Instance !== this) { return; }
            await this.Init();
        };
        NitrateProcess.OnInit(SimulationManager, this.onSimInit);
    }

    private async Init(): Promise<void> {
        const renderer = Renderer.Instance?.GetWebGPU();
        const sim = SimulationManager.Instance;
        if (!renderer || !sim?.pingPong || !sim.materialVisualBuffer) { return; }

        const { device, format } = renderer;
        const shaderModule = device.createShaderModule({ code: ShaderAssembler.Display() });
        this.pipeline = await device.createRenderPipelineAsync({
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
        this.targets = sim.pingPong;
        this.materialVisualBuffer = sim.materialVisualBuffer;

        const { width, height } = sim.pingPong;
        const { chunk } = WorldConfig.GetConfig();
        const margin = chunk.margin * chunk.size;
        const hasWorld = World.Instance !== null;
        const offsetU = hasWorld ? margin / width : 0;
        const offsetV = hasWorld ? margin / height : 0;
        const scaleU  = hasWorld ? (width  - 2 * margin) / width  : 1;
        const scaleV  = hasWorld ? (height - 2 * margin) / height : 1;

        if (!this.cropBuffer) {
            this.cropBuffer = device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
        }
        device.queue.writeBuffer(this.cropBuffer, 0, new Float32Array([offsetU, offsetV, scaleU, scaleV]));
    }

    public Update(now: number): void {
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!renderer || !this.pipeline || !this.targets || !this.materialVisualBuffer) { return; }
        const { device } = renderer;

        if (!this.cropBuffer) { return; }

        const world = World.Instance;
        const cam = Camera.Instance;
        if (world && cam) {
            const { width, height } = this.targets;
            const { chunk } = WorldConfig.GetConfig();
            const margin = chunk.margin * chunk.size;
            const contentW = width - 2 * margin;
            const contentH = height - 2 * margin;
            const { x: camX, y: camY } = cam.GetCameraPos();
            const offsetU = (margin + camX * contentW / renderer.canvas.width) / width;
            const offsetV = (margin - camY * contentH / renderer.canvas.height) / height;
            const scaleU = contentW / width;
            const scaleV = contentH / height;
            device.queue.writeBuffer(this.cropBuffer, 0, new Float32Array([offsetU, offsetV, scaleU, scaleV]));
        }

        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.targets.currentIdentity.createView() },
                { binding: 1, resource: { buffer: this.materialVisualBuffer.buffer } },
                { binding: 2, resource: { buffer: this.cropBuffer } },
            ],
        });

        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
            colorAttachments: [{
                view: renderer.context.getCurrentTexture().createView(),
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([enc.finish()]);
    }

    public OnResize(): void {
        this.targets = null;
        this.materialVisualBuffer = null;
    }

    public OnDestroy(): void {
        NitrateProcess.RemoveInitListener(SimulationManager, this.onSimInit);
        this.pipeline = null;
        this.targets = null;
        this.materialVisualBuffer = null;
        this.cropBuffer?.destroy();
        this.cropBuffer = null;
        if (RenderingManager.Instance === this) { RenderingManager.Instance = null; }
    }
}