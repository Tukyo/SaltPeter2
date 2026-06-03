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

    public readonly gameObjectsTexture: GPUTexture;
    public readonly particleTexture: GPUTexture;
    public readonly simTexture: GPUTexture;

    private constructor(
        size: Size2D,
        gameObjectsTexture: GPUTexture,
        particleTexture: GPUTexture,
        simTexture: GPUTexture,
    ) {
        this.size = size;
        this.gameObjectsTexture = gameObjectsTexture;
        this.particleTexture = particleTexture;
        this.simTexture = simTexture;
    }

    /** Allocates all layer textures and returns a ready-to-use instance. @internal */
    public static Create(device: GPUDevice, size: Size2D): RenderingLayers {
        const textureUsage =
            GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
        const simTexture = TextureFactory.Create2D(device, size.width, size.height, 'rgba8unorm');
        const gameObjectsTexture = device.createTexture({
            size: [size.width, size.height], format: 'rgba8unorm', usage: textureUsage,
        });
        const particleTexture = device.createTexture({
            size: [size.width, size.height], format: 'rgba8unorm', usage: textureUsage,
        });
        return new RenderingLayers(size, gameObjectsTexture, particleTexture, simTexture);
    }

    // @omitfromdocs
    public Destroy(): void {
        this.simTexture.destroy();
        this.gameObjectsTexture.destroy();
        this.particleTexture.destroy();
    }
}
