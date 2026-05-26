/** Factory for creating GPU textures with standard usage flags. */
export class TextureFactory {
    /** Creates a 2D GPU texture with standard storage, binding, copy read and write usage flags. @internal */
    public static Create2D(
        device: GPUDevice,
        width: number,
        height: number,
        format: GPUTextureFormat
    ): GPUTexture {
        return device.createTexture({
            size: [width, height],
            format,
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC,
        });
    }
}