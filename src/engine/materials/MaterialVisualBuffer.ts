import type { MaterialName } from './definitions/MaterialIdentity';

import { MaterialRegistry } from './MaterialRegistry';
import { MaterialVisualSchema } from './MaterialVisualSchema';

/**
 * GPU storage buffer containing per-material color data for every registered material.
 *
 * Built once at startup — packs each material's four base colors and any variant color sets
 * into a flat `Float32Array` (RGBA normalized to 0–1), indexed by material id. Uploaded as
 * an immutable `STORAGE` buffer. Layout is defined by {@link MaterialVisualSchema}.
 */
export class MaterialVisualBuffer {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const colorsPerMaterial = MaterialVisualSchema.GetColorsPerMaterial();
        const totalColorsPerMaterial = MaterialVisualSchema.GetTotalColorsPerMaterial();

        const names = Object.keys(MaterialRegistry.Materials) as MaterialName[];
        const data = new Float32Array(names.length * totalColorsPerMaterial * 4);

        for (const name of names) {
            const material = MaterialRegistry.Materials[name];
            const base = material.id * totalColorsPerMaterial * 4;

            for (let i = 0; i < material.colors.length; i++) {
                const color = material.colors[i];
                const offset = base + i * 4;
                data[offset]     = color.r / 255;
                data[offset + 1] = color.g / 255;
                data[offset + 2] = color.b / 255;
                data[offset + 3] = color.a;
            }

            if (material.variants) {
                for (const variant of material.variants) {
                    const variantBase = base + variant.id * colorsPerMaterial * 4;
                    for (let i = 0; i < variant.colors.length; i++) {
                        const color = variant.colors[i];
                        const offset = variantBase + i * 4;
                        data[offset]     = color.r / 255;
                        data[offset + 1] = color.g / 255;
                        data[offset + 2] = color.b / 255;
                        data[offset + 3] = color.a;
                    }
                }
            }
        }

        this.buffer = device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(this.buffer, 0, data);
    }

    public OnDestroy(): void {
        this.buffer.destroy();
    }
}
