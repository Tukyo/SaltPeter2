import type { ParticleDefinition } from '../ParticleModel';
import { ParticleIds } from '../Particles';
import { MaterialIds } from '../../materials/definitions/Materials';
import { NoiseType } from '../../utility/Noise';

export const Fire: ParticleDefinition = {
    id: ParticleIds.fire,
    name: 'fire',
    modules: {
        main: {
            duration: Infinity,
            loop: true,
            start: {
                lifetime: { min: 1, max: 10 },
                speed: { min: 0.5, max: 5 },
            }
        },
        visual: { material: MaterialIds.fire },
        emission: {
            rate: { time: 0.5 }
        },
        shape: {
            cone: {
                angle: 20,
                length: 1,
                direction: { x: 0, y: 1 },
            },
        },
        velocityOverLifetime: {
            linear: {
                y: { start: 2.5, end: 0.25 },
            },
        },
        noise: {
            type: NoiseType.Perlin,
            octaves: 2,
            persistence: 0.5,
            scale: 0.4,
            amplitude: { first: 10.0, second: 16.0 },
            scrollSpeed: {
                first: { x: 0.025, y: -0.1 },
                second: { x: -0.04, y: -0.07 },
            },
        },
        colorOverLifetime: {
            start: {
                first: { r: 255, g: 255, b: 255, a: 1.0 },
                second: { r: 255, g: 160, b: 40, a: 0.8 },
            },
            end: {
                first: { r: 255, g: 255, b: 255, a: 0.0 },
                second: { r: 180, g: 60, b: 10, a: 0.2 },
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
