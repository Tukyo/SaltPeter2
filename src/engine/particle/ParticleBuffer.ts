import type { SimulationResource } from '../simulation/SimulationManager';

import { ParticleConfig } from '../config/ParticleConfig';

/**
 * GPU storage buffer holding the live state of every particle for the current frame.
 *
 * Capacity is fixed at startup from {@link ParticleConfig}. Each slot stores:
 * posX, posY, velX, velY, lifetimeRemaining, maxLifetime, particleId, active.
 * Layout is read and written by the particle emission and simulation compute passes.
 */
export class ParticleBuffer implements SimulationResource {
    public static readonly FloatsPerParticle = 14;

    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const { maxParticles } = ParticleConfig.GetConfig().performance;

        this.buffer = device.createBuffer({
            size: maxParticles * ParticleBuffer.FloatsPerParticle * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
    }

    // @omitfromdocs
    public Destroy(): void {
        this.buffer.destroy();
    }
}
