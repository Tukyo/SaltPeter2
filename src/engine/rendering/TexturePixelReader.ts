import type { SimulationResource } from "../simulation/SimulationManager";
import type { Size2D, Vec2 } from "../definitions/Primitives";

type ReadPixelParams = {
    texture: GPUTexture;
    pos: Vec2;
    format: 'rgba8unorm' | 'rgba16float' | 'rgba32float';
};

/**
 * Utility for reading pixel data back from GPU textures to the CPU.
 *
 * Maintains a small reusable `MAP_READ` buffer for single-pixel reads. `ReadRegion` allocates
 * a temporary buffer sized to the requested rows and destroys it after the read.
 */
export class TexturePixelReader implements SimulationResource {
    private static readonly BytesPerRow = 256;

    private readonly device: GPUDevice;
    private readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        this.device = device;
        this.buffer = device.createBuffer({
            size: TexturePixelReader.BytesPerRow,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
    }

    /** Reads a single pixel from a GPU texture at the given coordinates. Returns RGBA as a number array. */
    public async ReadPixel(params: ReadPixelParams): Promise<number[]> {
        const { texture, pos, format } = params;

        let bytesPerPixel = 0;
        switch (format) {
            case 'rgba32float': bytesPerPixel = 16; break;
            case 'rgba16float': bytesPerPixel = 8; break;
            case 'rgba8unorm':  bytesPerPixel = 4; break;
        }

        const encoder = this.device.createCommandEncoder();
        encoder.copyTextureToBuffer(
            { texture, origin: { x: pos.x, y: pos.y, z: 0 } },
            { buffer: this.buffer, bytesPerRow: TexturePixelReader.BytesPerRow, rowsPerImage: 1 },
            { width: 1, height: 1, depthOrArrayLayers: 1 }
        );

        this.device.queue.submit([encoder.finish()]);

        await this.buffer.mapAsync(GPUMapMode.READ, 0, bytesPerPixel);

        const bytes = new Uint8Array(bytesPerPixel);
        bytes.set(new Uint8Array(this.buffer.getMappedRange(0, bytesPerPixel)));
        this.buffer.unmap();

        switch (format) {
            case 'rgba8unorm':
                return [bytes[0], bytes[1], bytes[2], bytes[3]];
            case 'rgba16float': {
                const view = new DataView(bytes.buffer);
                return [
                    view.getFloat16(0, true),
                    view.getFloat16(2, true),
                    view.getFloat16(4, true),
                    view.getFloat16(6, true),
                ];
            }
            case 'rgba32float': {
                const view = new DataView(bytes.buffer);
                return [
                    view.getFloat32(0, true),
                    view.getFloat32(4, true),
                    view.getFloat32(8, true),
                    view.getFloat32(12, true),
                ];
            }
        }
    }

    /**
     * Reads a rectangular strip of full rows from a texture.
     * Returns raw bytes (rgba8unorm) and the aligned bytes-per-row stride.
     */
    public async ReadRegion(params: {
        texture: GPUTexture;
        rowStart: number;
        rowCount: number;
        fullWidth: number;
    }): Promise<{ data: Uint8Array; bytesPerRow: number }> {
        const { texture, rowStart, rowCount, fullWidth } = params;

        const bytesPerRow = Math.ceil(fullWidth * 4 / 256) * 256;
        const bufferSize = bytesPerRow * rowCount;

        const buffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const encoder = this.device.createCommandEncoder();
        encoder.copyTextureToBuffer(
            { texture, origin: { x: 0, y: rowStart, z: 0 } },
            { buffer, bytesPerRow, rowsPerImage: rowCount },
            { width: fullWidth, height: rowCount, depthOrArrayLayers: 1 }
        );
        this.device.queue.submit([encoder.finish()]);

        await buffer.mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(bufferSize);
        data.set(new Uint8Array(buffer.getMappedRange()));
        buffer.unmap();
        buffer.destroy();

        return { data, bytesPerRow };
    }

    /**
     * Reads an arbitrary rectangle from a texture.
     * Returns raw bytes (rgba8unorm) and the aligned bytes-per-row stride.
     */
    public async ReadRect(params: {
        texture: GPUTexture;
        pos: Vec2;
        size: Size2D;
    }): Promise<{ data: Uint8Array; bytesPerRow: number }> {
        const { texture, pos, size } = params;

        const bytesPerRow = Math.ceil(size.width * 4 / 256) * 256;
        const bufferSize = bytesPerRow * size.height;

        const buffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const encoder = this.device.createCommandEncoder();
        encoder.copyTextureToBuffer(
            { texture, origin: { x: pos.x, y: pos.y, z: 0 } },
            { buffer, bytesPerRow, rowsPerImage: size.height },
            { width: size.width, height: size.height, depthOrArrayLayers: 1 }
        );
        this.device.queue.submit([encoder.finish()]);

        await buffer.mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(bufferSize);
        data.set(new Uint8Array(buffer.getMappedRange()));
        buffer.unmap();
        buffer.destroy();

        return { data, bytesPerRow };
    }

    // @omitfromdocs
    public Destroy(): void {
        this.buffer.destroy();
    }
}
