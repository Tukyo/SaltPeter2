import type { SimulationResource } from '../simulation/SimulationManager';
import type { Vec2 } from '../definitions/Primitives';

import { ParticleConfig } from '../config/ParticleConfig';

interface ParticleEmitter {
    id: number;
    pos: Vec2;
    delay: number;
    duration: number;
    loop: boolean;
}

/**
 * GPU storage buffer holding the active GameObject based particle emitter list for the current frame.
 *
 * Each slot stores: posX, posY, particleId, isActive (4 floats).
 * Rebuilt CPU-side every frame via {@link Update} before the GameObject emission pass dispatches.
 * Internally tracks per-emitter start times to evaluate delay, duration, and loop behaviour.
 */
export class ParticleEmitterBuffer implements SimulationResource {
    public static readonly FloatsPerEmitter = 4;

    public readonly buffer: GPUBuffer;
    public readonly capacity: number;

    private readonly data: Float32Array;
    private readonly startTimes = new Map<number, number>();

    constructor(device: GPUDevice) {
        this.capacity = ParticleConfig.GetConfig().performance.maxGameObjectEmitters;
        this.data = new Float32Array(this.capacity * ParticleEmitterBuffer.FloatsPerEmitter);

        this.buffer = device.createBuffer({
            size: this.data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
    }

    /** Packs active particle emitter state into the GPU buffer for the current frame. @internal */
    public Update(device: GPUDevice, emitters: ReadonlyArray<ParticleEmitter>, simTime: number): void {
        this.data.fill(0);
        const count = Math.min(emitters.length, this.capacity);

        const seenIds = new Set<number>();
        for (let i = 0; i < count; i++) {
            const emitter = emitters[i];
            seenIds.add(emitter.id);

            if (!this.startTimes.has(emitter.id)) {
                this.startTimes.set(emitter.id, simTime);
            }
            const startTime = this.startTimes.get(emitter.id) as number;
            const elapsed = simTime - startTime;
            const isActive = this.ComputeIsActive(elapsed, emitter.delay, emitter.duration, emitter.loop);

            const base = i * ParticleEmitterBuffer.FloatsPerEmitter;
            this.data[base + 0] = emitter.pos.x;
            this.data[base + 1] = emitter.pos.y;
            this.data[base + 2] = emitter.id;
            this.data[base + 3] = isActive ? 1 : 0;
        }

        for (const id of this.startTimes.keys()) {
            if (!seenIds.has(id)) { this.startTimes.delete(id); }
        }

        device.queue.writeBuffer(this.buffer, 0, this.data);
    }

    private ComputeIsActive(elapsed: number, delay: number, duration: number, loop: boolean): boolean {
        if (elapsed < delay) { return false; }
        if (loop || duration === Infinity) { return true; }
        return elapsed - delay < duration;
    }

    // @omitfromdocs
    public Destroy(): void {
        this.buffer.destroy();
    }
}
