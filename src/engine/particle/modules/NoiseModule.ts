import type { NoiseType } from '../../utility/Noise';
import type { Vec2 } from '../../definitions/Primitives';

export interface ParticleNoiseModule {
    type: NoiseType;
    octaves: number;
    persistence: number;
    scale: number;
    amplitude: number;
    scrollSpeed: Vec2;
}
