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
                speed: { min: 0.5, max: 4 },
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
        inheritVelocity: {
            mode: 'Initial',
            multiplier: 1000,
        },
        noise: {
            type: NoiseType.Perlin,
            octaves: 3,
            persistence: 0.5,
            scale: 0.15,
            amplitude: { first: 6.0, second: 10.0 },
            scrollSpeed: {
                first: { x: 0.05, y: -0.03 },
                second: { x: -0.02, y: -0.06 },
            },
        },
        colorOverLifetime: {
            start: {
                first: { r: 255, g: 255, b: 255, a: 0.9 },
                second: { r: 160, g: 160, b: 160, a: 0.7 },
            },
            end: {
                first: { r: 255, g: 255, b: 255, a: 0.0 },
                second: { r: 80, g: 80, b: 80, a: 0.1 },
            },
        },
        collision: {
            bounce: 0.1,
            dampen: 0.8,
            lifetimeLoss: 0.3,
            minKillSpeed: 0.5,
        },
    }
};
