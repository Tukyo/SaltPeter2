import type { ParticleId } from './ParticleIdentity';

import { ParticleConfig } from '../config/ParticleConfig';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { ParticleRegistry } from './ParticleRegistry';
import { Sources } from './ParticleSources';

/**
 * GPU storage buffer mapping each material ID to the particle IDs it emits.
 *
 * Built once at startup from {@link Sources}. Each material slot holds up to
 * `maxParticlesPerMaterial` particle IDs (from {@link ParticleConfig}), padded with -1.
 * Indexed in the shader as materialId * maxParticlesPerMaterial + slotIndex.
 */
export class ParticleSourceLookupBuffer {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const { maxParticlesPerMaterial } = ParticleConfig.GetConfig().performance;
        const materialCount = Object.keys(MaterialRegistry.Materials).length;
        const data = new Float32Array(materialCount * maxParticlesPerMaterial).fill(-1);

        for (const source of Sources) {
            const particleIds = source.particles
                .map(name => ParticleRegistry.Particles[name]?.id)
                .filter((id): id is ParticleId => id !== undefined);

            for (const materialName of source.materials) {
                const material = MaterialRegistry.Materials[materialName];
                if (!material) { continue; }

                const base = material.id * maxParticlesPerMaterial;
                for (let i = 0; i < particleIds.length && i < maxParticlesPerMaterial; i++) {
                    data[base + i] = particleIds[i];
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
