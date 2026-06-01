import type { Size2D } from '../definitions/Primitives';

import { TextureFactory } from './TextureFactory';

/**
 * Owns one GPU texture per renderable layer. Every subsystem writes its resolved
 * RGBA output into its designated texture via `RunRender`.
 *
 * Created and owned by {@link RenderingManager}. Passed by reference to each
 * subsystem's `RunRender` so they can write into their designated texture.
 */
export class RenderingLayers {
    public readonly size: Size2D;

    public readonly simTexture: GPUTexture;
    public readonly gameObjectsTexture: GPUTexture;

    private constructor(size: Size2D, simTexture: GPUTexture, gameObjectsTexture: GPUTexture) {
        this.size = size;
        this.simTexture = simTexture;
        this.gameObjectsTexture = gameObjectsTexture;
    }

    /** Allocates all layer textures and returns a ready-to-use instance. @internal */
    public static Create(device: GPUDevice, size: Size2D): RenderingLayers {
        const simTexture = TextureFactory.Create2D(device, size.width, size.height, 'rgba8unorm');
        const gameObjectsTexture = device.createTexture({
            size: [size.width, size.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
        });
        return new RenderingLayers(size, simTexture, gameObjectsTexture);
    }

    // @omitfromdocs
    public Destroy(): void {
        this.simTexture.destroy();
        this.gameObjectsTexture.destroy();
    }
}
