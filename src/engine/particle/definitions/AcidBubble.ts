import type { ParticleDefinition } from '../ParticleModel';

import { ParticleIds } from '../Particles';

export const AcidBubble: ParticleDefinition = {
    id: ParticleIds.acid_bubble,
    name: 'acid_bubble',
    modules: {
        main: {
            duration: Infinity,
            loop: true,
            start: {
                lifetime: { min: 0.5, max: 2 },
                speed: { min: 0.01, max: 1 },
            }
        },
        shape: {
            circle: { radius: 1 },
        },
        colorOverLifetime: {
            start: {
                first: { r: 180, g: 255, b: 80, a: 0.5 },
                second: { r: 220, g: 255, b: 40, a: 0.7 },
            },
            end: {
                first: { r: 80, g: 180, b: 20, a: 0.0 },
                second: { r: 140, g: 220, b: 10, a: 0.15 },
            },
        },
    }
};
