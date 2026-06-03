import type { MaterialName } from './definitions/MaterialIdentity';
import type { SimulationResource } from '../simulation/SimulationManager';

import { MaterialRegistry } from './MaterialRegistry';
import { MaterialStateSchema } from './MaterialStateSchema';

/**
 * GPU storage buffer containing per-material default state for every registered material.
 *
 * Built once at startup — packs each material's initial `health` and `lifetime` into a flat
 * `Float32Array` indexed by material id, then uploads it as an immutable `STORAGE` buffer.
 * Layout is defined by {@link MaterialStateSchema}.
 */
export class MaterialStateBuffer implements SimulationResource {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const stateFields = MaterialStateSchema.GetMaterialStateFields();

        const names = Object.keys(MaterialRegistry.Materials) as MaterialName[];
        const floatsPerMaterial = stateFields.length;
        const data = new Float32Array(names.length * floatsPerMaterial);

        for (const name of names) {
            const material = MaterialRegistry.Materials[name];
            const base = material.id * floatsPerMaterial;

            data[base + 0] = material.state.health;
            data[base + 1] = material.state.lifetime ?? 0;
        }

        this.buffer = device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(this.buffer, 0, data);
    }

    // @omitfromdocs
    public Destroy(): void {
        this.buffer.destroy();
    }
}
