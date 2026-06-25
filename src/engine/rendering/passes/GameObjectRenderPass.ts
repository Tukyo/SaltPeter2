import type { MaterialVisualBuffer } from '../../materials/MaterialVisualBuffer';
import type { GameObjectLayer } from '../../game_object/GameObjectLayer';
import type { RenderingLayers } from '../RenderingLayers';

import { ShaderAssembler } from '../../shaders/ShaderAssembler';
import { SimulationConfig } from '../../config/SimulationConfig';

interface GameObjectRenderPassCreateParams {
    device: GPUDevice;
    gameObjectLayer: GameObjectLayer;
    materialVisualBuffer: MaterialVisualBuffer;
}

interface GameObjectRenderPassRunParams {
    encoder: GPUCommandEncoder;
    gameObjectLayer: GameObjectLayer;
    layers: RenderingLayers;
}

/**
 * Resolves the GameObject layer identity texture into RGBA color for the game objects layer.
 *
 * Reads `gameObjectLayer.currentIdentity` pixel-by-pixel (including bleed pixels written
 * by the stamp pass) and writes resolved RGBA into {@link RenderingLayers.gameObjectsTexture}.
 * Unoccupied pixels write transparent so the composite shows world sim underneath.
 *
 * Created and owned by {@link RenderingManager}. Do not call directly.
 */
export class GameObjectRenderPass {
    private readonly device: GPUDevice;
    private readonly materialVisualBuffer: MaterialVisualBuffer;
    private readonly pipeline: GPUComputePipeline;
    private readonly workgroupSize: number;
    private readonly bindGroupCache = new Map<GPUTexture, GPUBindGroup>();

    private constructor(
        params: GameObjectRenderPassCreateParams,
        pipeline: GPUComputePipeline,
        workgroupSize: number
    ) {
        this.device = params.device;
        this.materialVisualBuffer = params.materialVisualBuffer;
        this.pipeline = pipeline;
        this.workgroupSize = workgroupSize;
    }

    /** Compiles the GameObject render shader and returns a ready-to-use pass. @internal */
    public static async Create(
        params: GameObjectRenderPassCreateParams
    ): Promise<GameObjectRenderPass> {
        const workgroupSize = SimulationConfig.GetConfig().performance.workgroupSize;
        const pipeline = await params.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: params.device.createShaderModule({
                    code: ShaderAssembler.GameObjectRender(workgroupSize),
                }),
                entryPoint: 'main',
            },
        });
        return new GameObjectRenderPass(params, pipeline, workgroupSize);
    }

    /** Writes resolved GameObject layer RGBA colors into `layers.gameObjectsTexture`. @internal */
    public Run(params: GameObjectRenderPassRunParams): void {
        const { encoder, gameObjectLayer, layers } = params;

        const cacheKey = gameObjectLayer.currentIdentity;
        let bindGroup = this.bindGroupCache.get(cacheKey);
        if (!bindGroup) {
            bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: gameObjectLayer.currentIdentity.createView() },
                    { binding: 1, resource: { buffer: this.materialVisualBuffer.buffer } },
                    { binding: 2, resource: layers.gameObjectsTexture.createView() },
                ],
            });
            this.bindGroupCache.set(cacheKey, bindGroup);
        }

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(gameObjectLayer.width / this.workgroupSize),
            Math.ceil(gameObjectLayer.height / this.workgroupSize)
        );
        pass.end();
    }

    // @omitfromdocs
    public Destroy(): void {
        this.bindGroupCache.clear();
    }
}
