import type { MaterialName } from './definitions/MaterialIdentity';
import type { SimulationResource } from '../simulation/SimulationManager';

import { MaterialRegistry } from './MaterialRegistry';
import { MaterialPhaseIds } from './definitions/MaterialPhases';
import { MaterialPhysicsSchema } from './MaterialPhysicsSchema';

/**
 * GPU storage buffer containing per-material physics data for every registered material.
 *
 * Built once at startup from {@link MaterialRegistry} — iterates every material definition,
 * packs phase id, density, durability, temperature parameters, and all transition thresholds
 * into a flat `Float32Array` indexed by material id, then uploads it as an immutable
 * `STORAGE` buffer. Layout is defined by {@link MaterialPhysicsSchema}.
 */
export class MaterialPhysicsBuffer implements SimulationResource {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const physicsFields = MaterialPhysicsSchema.GetMaterialPhysicsFields();

        const names = Object.keys(MaterialRegistry.Materials) as MaterialName[];
        const floatsPerMaterial = physicsFields.length;
        const data = new Float32Array(names.length * floatsPerMaterial);

        for (const name of names) {
            const material = MaterialRegistry.Materials[name];
            const base = material.id * floatsPerMaterial;

            const resolveId = (name: MaterialName | undefined) =>
                name !== undefined ? MaterialRegistry.Materials[name].id : 0;

            const trans = material.transitions ?? {};

            data[base + 0] = MaterialPhaseIds[material.phase];
            const isLiquid = material.phase === 'liquid';
            data[base + 1] = isLiquid ? Math.min(material.physics.density, 1.0) : material.physics.density;
            data[base + 2] = material.physics.durability;
            data[base + 3] = material.physics.temperature.specificHeat;
            data[base + 4] = material.physics.temperature.restingTemperature;
            data[base + 5] = trans.melts?.condition.temperature ?? 0;
            data[base + 6] = resolveId(trans.melts?.to);
            data[base + 7] = trans.boils?.condition.temperature ?? 0;
            data[base + 8] = resolveId(trans.boils?.to);
            data[base + 9] = trans.freezes?.condition.temperature ?? 0;
            data[base + 10] = resolveId(trans.freezes?.to);
            data[base + 11] = trans.condenses?.condition.temperature ?? 0;
            data[base + 12] = resolveId(trans.condenses?.to);
            data[base + 13] = material.physics.temperature.restingStrength;
            data[base + 14] = material.physics.contact.friction;
            data[base + 15] = material.physics.contact.restitution;
            data[base + 16] = material.physics.contact.hardness;
            data[base + 17] = material.physics.flammability ?? 0;
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
