import type { Size2D } from '../definitions/Primitives';

/**
 * A single `rgba8unorm` GPU texture used as the intent buffer between simulation passes.
 *
 * Created by {@link SimulationManager} and shared with the passes that need it.
 */
export class SimulationTexture {
    public readonly width: number;
    public readonly height: number;
    public readonly texture: GPUTexture;

    constructor(device: GPUDevice, size: Size2D) {
        this.width = size.width;
        this.height = size.height;
        this.texture = device.createTexture({
            size: [size.width, size.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
    }

    public OnDestroy(): void {
        this.texture.destroy();
    }
}
