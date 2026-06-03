import type { ParticleDefinition } from '../ParticleModel';
import { ParticleIds } from '../Particles';
import { MaterialIds } from '../../materials/definitions/Materials';

export const Lava: ParticleDefinition = {
    id: ParticleIds.lava,
    name: 'lava',
    modules: {
        main: {
            duration: Infinity,
            loop: true,
            start: {
                lifetime: { min: 2, max: 5 },
                speed: { min: 1, max: 5 },
            },
            gravityMultiplier: -1,
        },
        visual: { material: MaterialIds.fire },
        shape: {
            cone: {
                angle: 80,
                length: 0,
                direction: { x: 0, y: 1 }
            },
        },
        emission: {
            rate: {
                time: 0.01
            }
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