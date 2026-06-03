import type { ParticleDefinition } from '../ParticleModel';
import { ParticleIds } from '../Particles';
import { MaterialIds } from '../../materials/definitions/Materials';
import { NoiseType } from '../../utility/Noise';

export const Smoke: ParticleDefinition = {
    id: ParticleIds.smoke,
    name: 'smoke',
    modules: {
        main: {
            duration: Infinity,
            loop: true,
            start: {
                lifetime: { min: 3, max: 60 },
                speed: { min: 0.1, max: 5 },
            }
        },
        visual: { material: MaterialIds.smoke },
        emission: {
            rate: { time: 0.15 }
        },
        shape: {
            cone: {
                angle: 40,
                length: 2,
                direction: { x: 0, y: 1 },
            },
        },
        velocityOverLifetime: {
            linear: {
                y: { start: 1.5, end: 0.5 },
            },
        },
        noise: {
            type: NoiseType.Perlin,
            octaves: 3,
            persistence: 0.5,
            scale: 0.15,
            amplitude: 6.0,
            scrollSpeed: { x: 0.05, y: -0.03 }
        },
        colorOverLifetime: {
            start: { r: 255, g: 255, b: 255, a: 0.9 },
            end: { r: 255, g: 255, b: 255, a: 0.0 },
        },
        collision: {
            bounce: 0.1,
            dampen: 0.8,
            lifetimeLoss: 0.3,
            minKillSpeed: 0.5,
        },
    }
};
