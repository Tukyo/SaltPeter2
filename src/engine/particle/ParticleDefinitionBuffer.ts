import type { ParticleName } from './ParticleIdentity';
import type { SimulationResource } from '../simulation/SimulationManager';

import { NoiseType } from '../utility/Noise';
import { ParticleRegistry } from './ParticleRegistry';
import { ParticleSchema } from './ParticleSchema';

/**
 * GPU storage buffer containing per-definition static params for every registered particle type.
 *
 * Built once at startup from {@link ParticleRegistry} — packs each definition's emission rate,
 * lifetime range, speed range, and visual params into a flat `Float32Array` indexed by particle id.
 * Layout is defined by {@link ParticleSchema}.
 */
export class ParticleDefinitionBuffer implements SimulationResource {
    public readonly buffer: GPUBuffer;

    constructor(device: GPUDevice) {
        const fields = ParticleSchema.GetParticleDefinitionFields();
        const floatsPerDefinition = fields.length;

        const names = Object.keys(ParticleRegistry.Particles) as ParticleName[];
        const data = new Float32Array(names.length * floatsPerDefinition);

        for (const name of names) {
            const particle = ParticleRegistry.Particles[name];
            const base = particle.id * floatsPerDefinition;
            const {
                main, visual, emission, shape,
                velocityOverLifetime: vol, noise, colorOverLifetime: colt, collision,
            } = particle.modules;
            const cone = shape?.cone;
            const box = shape?.box;
            const circle = shape?.circle;
            const volLinear = vol?.linear;

            let shapeType = 0;
            if (cone) shapeType = 1;
            else if (box) shapeType = 2;
            else if (circle) shapeType = 3;

            data[base + 0]  = emission?.rate?.time ?? 0;
            data[base + 1]  = main.start.lifetime.min;
            data[base + 2]  = main.start.lifetime.max;
            data[base + 3]  = main.start.speed.min;
            data[base + 4]  = main.start.speed.max;
            data[base + 5]  = main.loop ? 1 : 0;
            data[base + 6]  = main.duration === Infinity ? -1 : main.duration;
            data[base + 7]  = visual.material !== undefined ? visual.material : -1;
            data[base + 8]  = (visual.color?.r ?? 0) / 255;
            data[base + 9]  = (visual.color?.g ?? 0) / 255;
            data[base + 10] = (visual.color?.b ?? 0) / 255;
            data[base + 11] = visual.color?.a ?? 0;
            data[base + 12] = main.gravityMultiplier ?? 0;
            data[base + 13] = cone ? (cone.angle * Math.PI / 180) : 0;
            data[base + 14] = cone?.direction.x ?? 0;
            data[base + 15] = cone?.direction.y ?? 0;
            data[base + 16] = volLinear?.x?.start ?? 0;
            data[base + 17] = volLinear?.x?.end ?? 0;
            data[base + 18] = volLinear?.y?.start ?? 0;
            data[base + 19] = volLinear?.y?.end ?? 0;
            data[base + 20] = vol?.speedMultiplier ?? 1;
            data[base + 21] = main.start.delay ?? 0;
            data[base + 22] = emission?.rate?.distance ?? 0;
            data[base + 23] = shapeType;
            data[base + 24] = cone?.length ?? 0;
            data[base + 25] = box?.size.width ?? 0;
            data[base + 26] = box?.size.height ?? 0;
            data[base + 27] = circle?.radius ?? 0;
            data[base + 28] = noise ? 1 : 0;
            data[base + 29] = noise ? Object.values(NoiseType).indexOf(noise.type) : 0;
            data[base + 30] = noise?.octaves ?? 0;
            data[base + 31] = noise?.persistence ?? 0;
            data[base + 32] = noise?.scale ?? 0;
            data[base + 33] = noise?.amplitude ?? 0;
            data[base + 34] = colt ? 1 : 0;
            data[base + 35] = (colt?.start.r ?? 0) / 255;
            data[base + 36] = (colt?.start.g ?? 0) / 255;
            data[base + 37] = (colt?.start.b ?? 0) / 255;
            data[base + 38] = colt?.start.a ?? 0;
            data[base + 39] = (colt?.end.r ?? 0) / 255;
            data[base + 40] = (colt?.end.g ?? 0) / 255;
            data[base + 41] = (colt?.end.b ?? 0) / 255;
            data[base + 42] = colt?.end.a ?? 0;
            data[base + 43] = collision ? 1 : 0;
            data[base + 44] = collision?.bounce ?? 0;
            data[base + 45] = collision?.dampen ?? 0;
            data[base + 46] = collision?.lifetimeLoss ?? 0;
            data[base + 47] = collision?.minKillSpeed ?? 0;
            data[base + 48] = noise?.scrollSpeed.x ?? 0;
            data[base + 49] = noise?.scrollSpeed.y ?? 0;
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
