import type { ParticleDefinition } from './ParticleModel';
import type { ParticleName } from './ParticleIdentity';
import type { SimulationResource } from '../simulation/SimulationManager';

import { NoiseType } from '../utility/Noise';
import { Utils } from '../utility/Utils';
import { ParticleConfig } from '../config/ParticleConfig';
import { ParticleRegistry } from './ParticleRegistry';
import { ParticleSchema } from './ParticleSchema';

/**
 * GPU storage buffer containing per-definition static params for every registered particle type.
 *
 * Built once at startup from {@link ParticleRegistry} — packs each definition's emission rate,
 * lifetime range, speed range, and visual params into a flat `Float32Array` indexed by particle id.
 * Layout is defined by {@link ParticleSchema}.
 *
 * Additional slots beyond the registry are reserved for runtime-registered definitions from
 * {@link ParticleSystem} components. Call {@link RegisterDefinition} on first GO encounter.
 */
export class ParticleDefinitionBuffer implements SimulationResource {
    public readonly buffer: GPUBuffer;
    private readonly floatsPerDefinition: number;
    private nextRuntimeSlot: number;

    constructor(device: GPUDevice) {
        const fields = ParticleSchema.GetParticleDefinitionFields();
        this.floatsPerDefinition = fields.length;

        const names = Object.keys(ParticleRegistry.Particles) as ParticleName[];
        this.nextRuntimeSlot = names.length;
        const { maxGameObjectEmitters } = ParticleConfig.GetConfig().performance;
        const totalSlots = names.length + maxGameObjectEmitters;
        const data = new Float32Array(totalSlots * this.floatsPerDefinition);

        for (const name of names) {
            const particle = ParticleRegistry.Particles[name];
            ParticleDefinitionBuffer.PackDefinition(data, particle.id * this.floatsPerDefinition, particle.modules);
        }

        this.buffer = device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(this.buffer, 0, data);
    }

    /** Packs a runtime particle definition into the next available slot and returns the slot index. @internal */
    public RegisterDefinition(device: GPUDevice, modules: ParticleDefinition['modules']): number {
        const slot = this.nextRuntimeSlot++;
        const slotData = new Float32Array(this.floatsPerDefinition);
        ParticleDefinitionBuffer.PackDefinition(slotData, 0, modules);
        device.queue.writeBuffer(
            this.buffer,
            slot * this.floatsPerDefinition * Float32Array.BYTES_PER_ELEMENT,
            slotData
        );
        return slot;
    }

    private static PackDefinition(
        data: Float32Array,
        base: number,
        modules: ParticleDefinition['modules']
    ): void {
        const {
            main, visual, emission, shape, velocityOverLifetime,
            noise, colorOverLifetime, collision, inheritVelocity, subEmitter,
        } = modules;
        const cone = shape?.cone;
        const box = shape?.box;
        const circle = shape?.circle;

        const conditionMap = { Birth: 0, Collision: 1, Death: 2 };

        const inheritBits: Record<keyof ParticleDefinition['modules'], number> = {
            main: 1 << 0,
            visual: 1 << 1,
            emission: 1 << 2,
            shape: 1 << 3,
            subEmitter: 1 << 4,
            velocityOverLifetime: 1 << 5,
            inheritVelocity: 1 << 6,
            colorOverLifetime: 1 << 7,
            noise: 1 << 8,
            collision: 1 << 9,
        };
        const inheritMask = subEmitter?.inherit?.reduce((mask, mod) => mask | inheritBits[mod], 0) ?? 0;

        const emissionEnabled = emission !== undefined && emission.enabled !== false;
        const visualEnabled = visual !== undefined && visual.enabled !== false;
        const shapeEnabled = shape !== undefined && shape.enabled !== false;
        const velocityOverLifetimeEnabled = velocityOverLifetime !== undefined && velocityOverLifetime.enabled !== false;
        const inheritVelocityEnabled = inheritVelocity !== undefined && inheritVelocity.enabled !== false;
        const colorOverLifetimeEnabled = colorOverLifetime !== undefined && colorOverLifetime.enabled !== false;
        const noiseEnabled = noise !== undefined && noise.enabled !== false;
        const collisionEnabled = collision !== undefined && collision.enabled !== false;
        const subEmitterEnabled = subEmitter !== undefined && subEmitter.enabled !== false;

        const [colorFirst, colorSecond] =
            visual?.color !== undefined ? Utils.RandomBetweenTwo(visual.color) : [undefined, undefined];

        const volX = velocityOverLifetime?.linear?.x;
        const volY = velocityOverLifetime?.linear?.y;
        const [volXFirst, volXSecond] =
            volX !== undefined ? Utils.RandomBetweenTwo(volX) : [undefined, undefined];
        const [volYFirst, volYSecond] =
            volY !== undefined ? Utils.RandomBetweenTwo(volY) : [undefined, undefined];

        const [colorOverLifetimeStartFirst, colorOverLifetimeStartSecond] =
            colorOverLifetime !== undefined ? Utils.RandomBetweenTwo(colorOverLifetime.start) : [undefined, undefined];
        const [colorOverLifetimeEndFirst, colorOverLifetimeEndSecond] =
            colorOverLifetime !== undefined ? Utils.RandomBetweenTwo(colorOverLifetime.end) : [undefined, undefined];

        const [noiseAmplitudeFirst, noiseAmplitudeSecond] =
            noise?.amplitude !== undefined ? Utils.RandomBetweenTwo(noise.amplitude) : [0, 0];
        const [scrollFirst, scrollSecond] =
            noise?.scrollSpeed !== undefined ? Utils.RandomBetweenTwo(noise.scrollSpeed) : [undefined, undefined];

        let shapeType = 0;
        if (shapeEnabled) {
            if (cone) shapeType = 1;
            else if (box) shapeType = 2;
            else if (circle) shapeType = 3;
        }

        const lifetime = main.start.lifetime;
        const lifetimeMin = typeof lifetime === 'number' ? lifetime : lifetime.min;
        const lifetimeMax = typeof lifetime === 'number' ? lifetime : lifetime.max;
        const speed = main.start.speed;
        const speedMin = typeof speed === 'number' ? speed : speed.min;
        const speedMax = typeof speed === 'number' ? speed : speed.max;

        // main [0-7]
        data[base + 0] = main.duration === Infinity ? -1 : main.duration;
        data[base + 1] = main.loop ? 1 : 0;
        data[base + 2] = main.gravityMultiplier ?? 0;
        data[base + 3] = main.start.delay ?? 0;
        data[base + 4] = lifetimeMin;
        data[base + 5] = lifetimeMax;
        data[base + 6] = speedMin;
        data[base + 7] = speedMax;
        // emission [8-10]
        data[base + 8]  = emissionEnabled ? 1 : 0;
        data[base + 9]  = emissionEnabled ? (emission?.rate?.time ?? 0) : 0;
        data[base + 10] = emissionEnabled ? (emission?.rate?.distance ?? 0) : 0;
        // visual [11-20]
        data[base + 11] = visualEnabled ? 1 : 0;
        data[base + 12] = visualEnabled ? (visual?.material !== undefined ? visual.material : -1) : -1;
        data[base + 13] = visualEnabled ? (colorFirst?.r ?? 0) / 255 : 0;
        data[base + 14] = visualEnabled ? (colorFirst?.g ?? 0) / 255 : 0;
        data[base + 15] = visualEnabled ? (colorFirst?.b ?? 0) / 255 : 0;
        data[base + 16] = visualEnabled ? (colorFirst?.a ?? 0) : 0;
        data[base + 17] = visualEnabled ? (colorSecond?.r ?? 0) / 255 : 0;
        data[base + 18] = visualEnabled ? (colorSecond?.g ?? 0) / 255 : 0;
        data[base + 19] = visualEnabled ? (colorSecond?.b ?? 0) / 255 : 0;
        data[base + 20] = visualEnabled ? (colorSecond?.a ?? 0) : 0;
        // shape [21-29]
        data[base + 21] = shapeEnabled ? 1 : 0;
        data[base + 22] = shapeEnabled ? shapeType : 0;
        data[base + 23] = shapeEnabled ? (cone ? cone.angle * Math.PI / 180 : 0) : 0;
        data[base + 24] = shapeEnabled ? (cone?.direction.x ?? 0) : 0;
        data[base + 25] = shapeEnabled ? (cone?.direction.y ?? 0) : 0;
        data[base + 26] = shapeEnabled ? (cone?.length ?? 0) : 0;
        data[base + 27] = shapeEnabled ? (box?.size.width ?? 0) : 0;
        data[base + 28] = shapeEnabled ? (box?.size.height ?? 0) : 0;
        data[base + 29] = shapeEnabled ? (circle?.radius ?? 0) : 0;
        // velocityOverLifetime [30-39]
        data[base + 30] = velocityOverLifetimeEnabled ? 1 : 0;
        data[base + 31] = velocityOverLifetimeEnabled ? (volXFirst?.start ?? 0) : 0;
        data[base + 32] = velocityOverLifetimeEnabled ? (volXFirst?.end ?? 0) : 0;
        data[base + 33] = velocityOverLifetimeEnabled ? (volYFirst?.start ?? 0) : 0;
        data[base + 34] = velocityOverLifetimeEnabled ? (volYFirst?.end ?? 0) : 0;
        data[base + 35] = velocityOverLifetimeEnabled ? (velocityOverLifetime?.speedMultiplier ?? 1) : 0;
        data[base + 36] = velocityOverLifetimeEnabled ? (volXSecond?.start ?? 0) : 0;
        data[base + 37] = velocityOverLifetimeEnabled ? (volXSecond?.end ?? 0) : 0;
        data[base + 38] = velocityOverLifetimeEnabled ? (volYSecond?.start ?? 0) : 0;
        data[base + 39] = velocityOverLifetimeEnabled ? (volYSecond?.end ?? 0) : 0;
        // inheritVelocity [40-42]
        data[base + 40] = inheritVelocityEnabled ? 1 : 0;
        data[base + 41] = inheritVelocityEnabled ? (inheritVelocity?.mode === 'Current' ? 1 : 0) : 0;
        data[base + 42] = inheritVelocityEnabled ? (inheritVelocity?.multiplier ?? 0) : 0;
        // colorOverLifetime [43-59]
        data[base + 43] = colorOverLifetimeEnabled ? 1 : 0;
        data[base + 44] = colorOverLifetimeEnabled ? (colorOverLifetimeStartFirst?.r ?? 0) / 255 : 0;
        data[base + 45] = colorOverLifetimeEnabled ? (colorOverLifetimeStartFirst?.g ?? 0) / 255 : 0;
        data[base + 46] = colorOverLifetimeEnabled ? (colorOverLifetimeStartFirst?.b ?? 0) / 255 : 0;
        data[base + 47] = colorOverLifetimeEnabled ? (colorOverLifetimeStartFirst?.a ?? 0) : 0;
        data[base + 48] = colorOverLifetimeEnabled ? (colorOverLifetimeEndFirst?.r ?? 0) / 255 : 0;
        data[base + 49] = colorOverLifetimeEnabled ? (colorOverLifetimeEndFirst?.g ?? 0) / 255 : 0;
        data[base + 50] = colorOverLifetimeEnabled ? (colorOverLifetimeEndFirst?.b ?? 0) / 255 : 0;
        data[base + 51] = colorOverLifetimeEnabled ? (colorOverLifetimeEndFirst?.a ?? 0) : 0;
        data[base + 52] = colorOverLifetimeEnabled ? (colorOverLifetimeStartSecond?.r ?? 0) / 255 : 0;
        data[base + 53] = colorOverLifetimeEnabled ? (colorOverLifetimeStartSecond?.g ?? 0) / 255 : 0;
        data[base + 54] = colorOverLifetimeEnabled ? (colorOverLifetimeStartSecond?.b ?? 0) / 255 : 0;
        data[base + 55] = colorOverLifetimeEnabled ? (colorOverLifetimeStartSecond?.a ?? 0) : 0;
        data[base + 56] = colorOverLifetimeEnabled ? (colorOverLifetimeEndSecond?.r ?? 0) / 255 : 0;
        data[base + 57] = colorOverLifetimeEnabled ? (colorOverLifetimeEndSecond?.g ?? 0) / 255 : 0;
        data[base + 58] = colorOverLifetimeEnabled ? (colorOverLifetimeEndSecond?.b ?? 0) / 255 : 0;
        data[base + 59] = colorOverLifetimeEnabled ? (colorOverLifetimeEndSecond?.a ?? 0) : 0;
        // noise [60-70]
        data[base + 60] = noiseEnabled ? 1 : 0;
        data[base + 61] = noiseEnabled ? (noise ? Object.values(NoiseType).indexOf(noise.type) : 0) : 0;
        data[base + 62] = noiseEnabled ? (noise?.octaves ?? 0) : 0;
        data[base + 63] = noiseEnabled ? (noise?.persistence ?? 0) : 0;
        data[base + 64] = noiseEnabled ? (noise?.scale ?? 0) : 0;
        data[base + 65] = noiseEnabled ? noiseAmplitudeFirst : 0;
        data[base + 66] = noiseEnabled ? noiseAmplitudeSecond : 0;
        data[base + 67] = noiseEnabled ? (scrollFirst?.x ?? 0) : 0;
        data[base + 68] = noiseEnabled ? (scrollFirst?.y ?? 0) : 0;
        data[base + 69] = noiseEnabled ? (scrollSecond?.x ?? 0) : 0;
        data[base + 70] = noiseEnabled ? (scrollSecond?.y ?? 0) : 0;
        // collision [71-75]
        data[base + 71] = collisionEnabled ? 1 : 0;
        data[base + 72] = collisionEnabled ? (collision?.bounce ?? 0) : 0;
        data[base + 73] = collisionEnabled ? (collision?.dampen ?? 0) : 0;
        data[base + 74] = collisionEnabled ? (collision?.lifetimeLoss ?? 0) : 0;
        data[base + 75] = collisionEnabled ? (collision?.minKillSpeed ?? 0) : 0;
        // subEmitter [76-80]
        data[base + 76] = subEmitterEnabled ? 1 : 0;
        data[base + 77] = subEmitterEnabled ? (subEmitter ? conditionMap[subEmitter.spawnCondition] : 0) : 0;
        data[base + 78] = subEmitterEnabled ? (subEmitter?.particle ?? 0) : 0;
        data[base + 79] = subEmitterEnabled ? (subEmitter?.probability ?? 0) : 0;
        data[base + 80] = subEmitterEnabled ? inheritMask : 0;
    }

    // @omitfromdocs
    public Destroy(): void {
        this.buffer.destroy();
    }
}
