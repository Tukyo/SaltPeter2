import type { ParticleDefinition } from '../ParticleModel';

import { MaterialIds } from '../../materials/definitions/Materials';
import { NoiseType } from '../../utility/Noise';
import { ParticleIds } from '../Particles';

export const Acid: ParticleDefinition = {
    id: ParticleIds.acid,
    name: 'acid',
    modules: {
        main: {
            duration: Infinity,
            loop: true,
            start: {
                lifetime: { min: 1, max: 15 },
                speed: { min: 0.1, max: 5 },
            }
        },
        visual: { material: MaterialIds.acid },
        shape: {
            cone: {
                angle: 30,
                length: 0,
                direction: { x: 0, y: 1 }
            },
        },
        emission: {
            rate: {
                time: 0.05
            }
        },
        noise: {
            type: NoiseType.Perlin,
            octaves: 2,
            persistence: 0.5,
            scale: 0.4,
            amplitude: 10.0,
            scrollSpeed: { x: 0.025, y: -0.1 }
        },
        colorOverLifetime: {
            start: { r: 255, g: 200, b: 50, a: 1.0 },
            end: { r: 80, g: 20, b: 10, a: 0.0 },
        },
        collision: {
            bounce: 0.6,
            dampen: 0.3,
            lifetimeLoss: 0.25,
            minKillSpeed: 5,
        }
    }
}