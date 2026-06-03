import type { MaterialName } from './definitions/MaterialIdentity';
import type { SimulationResource } from '../simulation/SimulationManager';

import { MaterialRegistry } from './MaterialRegistry';
import { MaterialSimulationSchema } from './MaterialSimulationSchema';
import { MaterialSimulation } from './MaterialSimulation';

/**
 * GPU storage buffer containing per-material simulation values for every registered material.
 *
 * Built once at startup — compiles each material's phase behavior through {@link MaterialSimulation},
 * packs the resulting simulation fields into a flat `Float32Array` indexed by material id, and
 * uploads it as an immutable `STORAGE` buffer. Layout is defined by {@link MaterialSimulationSchema}.
 */
export class MaterialSimulationBuffer implements SimulationResource {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const floatsPerMaterial = MaterialSimulationSchema.GetMaxFloatsPerMaterial();

        const names = Object.keys(MaterialRegistry.Materials) as MaterialName[];
        const data = new Float32Array(names.length * floatsPerMaterial);

        for (const name of names) {
            const material = MaterialRegistry.Materials[name];
            const { id } = material;
            const base = id * floatsPerMaterial;

            switch (material.phase) {
                case 'solid': {
                    const behavior = material.phaseBehavior.solid;
                    if (!behavior) {
                        throw new Error(`Solid material "${material.name}" is missing solid behavior.`);
                    }

                    const sim = MaterialSimulation.ComputeSolidSimulation(behavior);
                    const simFields = MaterialSimulationSchema.GetSolidSimulationFields();

                    for (let i = 0; i < simFields.length; i++) {
                        data[base + i] = sim[simFields[i]];
                    }

                    break;
                }
                case 'powder': {
                    const behavior = material.phaseBehavior.powder;
                    if (!behavior) {
                        throw new Error(`Powder material "${material.name}" is missing powder behavior.`);
                    }

                    const sim = MaterialSimulation.ComputePowderSimulation(behavior);
                    const simFields = MaterialSimulationSchema.GetPowderSimulationFields();

                    for (let i = 0; i < simFields.length; i++) {
                        data[base + i] = sim[simFields[i]];
                    }

                    break;
                }
                case 'liquid':
                    {
                        const behavior = material.phaseBehavior.liquid;
                        if (!behavior) {
                            throw new Error(`Liquid material "${material.name}" is missing liquid behavior.`);
                        }

                        const sim = MaterialSimulation.ComputeLiquidSimulation(behavior);
                        const simFields = MaterialSimulationSchema.GetLiquidSimulationFields();

                        for (let i = 0; i < simFields.length; i++) {
                            data[base + i] = sim[simFields[i]];
                        }

                        break;
                    }
                case 'gas': {
                    const behavior = material.phaseBehavior.gas;
                    if (!behavior) {
                        throw new Error(`Gas material "${material.name}" is missing gas behavior.`);
                    }

                    const sim = MaterialSimulation.ComputeGasSimulation(behavior);
                    const simFields = MaterialSimulationSchema.GetGasSimulationFields();

                    for (let i = 0; i < simFields.length; i++) {
                        data[base + i] = sim[simFields[i]];
                    }

                    break;
                }
                case 'fire': {
                    const behavior = material.phaseBehavior.fire;
                    if (!behavior) {
                        throw new Error(`Fire material "${material.name}" is missing fire behavior.`);
                    }

                    const sim = MaterialSimulation.ComputeFireSimulation(behavior);
                    const simFields = MaterialSimulationSchema.GetFireSimulationFields();

                    for (let i = 0; i < simFields.length; i++) {
                        data[base + i] = sim[simFields[i]];
                    }

                    break;
                }
            }
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
