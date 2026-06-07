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
            rate: { time: 0.05 }
        },
        subEmitter: {
            spawnCondition: 'Death',
            particle: ParticleIds.acid_bubble,
            inherit: ['visual', 'noise', 'collision'],
            probability: 0.4,
        },
        noise: {
            type: NoiseType.Perlin,
            octaves: 2,
            persistence: 0.5,
            scale: 0.4,
            amplitude: { first: 10.0, second: 15.0 },
            scrollSpeed: {
                first: { x: 0.025, y: -0.1 },
                second: { x: 0.04, y: -0.05 },
            },
        },
        colorOverLifetime: {
            start: {
                first: { r: 200, g: 255, b: 100, a: 1.0 },
                second: { r: 120, g: 255, b: 60, a: 0.75 },
            },
            end: {
                first: { r: 60, g: 180, b: 20, a: 0.5 },
                second: { r: 30, g: 120, b: 10, a: 0.0 },
            },
        },
        collision: {
            bounce: 0.6,
            dampen: 0.3,
            lifetimeLoss: 0.25,
            minKillSpeed: 5,
        }
    }
}