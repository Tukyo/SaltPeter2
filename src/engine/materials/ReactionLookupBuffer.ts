import type { MaterialName } from './definitions/MaterialIdentity';
import type { MaterialReactionReagent } from './definitions/MaterialReactions';

import { MaterialRegistry } from './MaterialRegistry';
import { Reactions } from './definitions/MaterialReactions';

const FLOATS_PER_ENTRY = 5; // productIdA, productIdB, invertedRate, biproductId, neighborMask  (-1 = none, 0 = all)

/**
 * GPU storage buffer containing a flattened N×N reaction lookup table for every material pair.
 *
 * Built once at startup from {@link Reactions} — resolves each reaction's reagents (by name
 * or tag) into material id pairs, then writes product ids, reaction rate, biproduct id, and
 * neighbor mask into a `Float32Array` at index `[idA * count + idB]`. Reactions are registered
 * bidirectionally so `A + B` and `B + A` are both populated. Unfilled entries default to `-1`.
 * The reaction rate is stored pre-inverted and scaled by reagent durability for GPU efficiency.
 */
export class ReactionLookupBuffer {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const count = Object.keys(MaterialRegistry.Materials).length;
        const data = new Float32Array(count * count * FLOATS_PER_ENTRY).fill(-1);

        const resolveId = (name: MaterialName): number =>
            MaterialRegistry.Materials[name].id;

        const getIds = (reagent: MaterialReactionReagent): number[] => {
            const ids: number[] = [];
            for (const name of reagent.materials ?? []) {
                ids.push(resolveId(name));
            }
            for (const tag of reagent.tags ?? []) {
                for (const name of Object.keys(MaterialRegistry.Materials) as MaterialName[]) {
                    const mat = MaterialRegistry.Materials[name];
                    if (mat.tags?.includes(tag)) ids.push(mat.id);
                }
            }
            return [...new Set(ids)];
        };

        for (const reaction of Reactions) {
            const { reagents, product, reactionRate } = reaction;

            if (reagents.length !== 2) continue;

            const idsA = getIds(reagents[0]);
            const idsB = getIds(reagents[1]);

            const biproductId = reaction.biproduct !== undefined ? resolveId(reaction.biproduct) : -1;

            for (const idA of idsA) {
                for (const idB of idsB) {
                    const productIdA = product[0] === 'self' ? idA : (product[0] !== undefined ? resolveId(product[0]) : 0);
                    const productIdB = product[1] === 'self' ? idB : (product[1] !== undefined ? resolveId(product[1]) : 0);
                    const baseAB = (idA * count + idB) * FLOATS_PER_ENTRY;
                    const mask = reaction.neighborMask ?? 0;

                    data[baseAB + 0] = productIdA;
                    data[baseAB + 1] = productIdB;
                    data[baseAB + 2] = 1 / reactionRate;
                    data[baseAB + 3] = biproductId;
                    data[baseAB + 4] = mask;

                    const baseBA = (idB * count + idA) * FLOATS_PER_ENTRY;
                    data[baseBA + 0] = productIdB;
                    data[baseBA + 1] = productIdA;
                    data[baseBA + 2] = 1 / reactionRate;
                    data[baseBA + 3] = -1;
                    data[baseBA + 4] = mask;
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
